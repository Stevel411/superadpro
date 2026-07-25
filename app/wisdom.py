"""Daily Wisdom — AdvantageLife.

One quote per day, platform-wide. Not randomised per member: 611 people
reading the same line on the same morning can talk about it, which a
per-member shuffle destroys.

The daily pick is recorded in `wisdom_daily` rather than computed from the
date, for three reasons: the library's dates become real history, adding a
quote does not reshuffle the past, and the record survives a change to the
selection rule.

Selection is least-recently-shown, tie-broken by id, over approved quotes
only. Nothing reaches a member until Steve has approved it.
"""

from datetime import date, datetime
from sqlalchemy import text as _text
from sqlalchemy.orm import Session

from .database import WisdomQuote, WisdomDaily, WisdomFavourite

THEMES = ["persistence", "risk", "money", "leadership", "starting_out"]

THEME_LABELS = {
    "persistence": "Persistence",
    "risk": "Risk",
    "money": "Money",
    "leadership": "Leadership",
    "starting_out": "Starting out",
}


# ── Daily pick ────────────────────────────────────────────────────────
def quote_for_date(db: Session, on: date = None) -> WisdomQuote:
    """Return THE quote for a date, choosing and recording one if needed.

    Idempotent. `wisdom_daily.show_date` is the primary key, so if two
    members land in the same second the second insert conflicts and both
    read back the same row — no duplicate-quote-of-the-day.
    """
    on = on or date.today()

    row = db.query(WisdomDaily).filter(WisdomDaily.show_date == on).first()
    if row:
        return db.query(WisdomQuote).filter(WisdomQuote.id == row.quote_id).first()

    pick = (db.query(WisdomQuote)
              .filter(WisdomQuote.approved.is_(True))
              .order_by(WisdomQuote.last_shown_on.asc().nullsfirst(),
                        WisdomQuote.id.asc())
              .first())
    if pick is None:
        return None

    db.execute(_text(
        "INSERT INTO wisdom_daily (show_date, quote_id, created_at) "
        "VALUES (:d, :q, :t) ON CONFLICT (show_date) DO NOTHING"
    ), {"d": on, "q": pick.id, "t": datetime.utcnow()})
    db.commit()

    # Re-read: under a race the winner may not be our pick.
    row = db.query(WisdomDaily).filter(WisdomDaily.show_date == on).first()
    won = db.query(WisdomQuote).filter(WisdomQuote.id == row.quote_id).first()

    if won.last_shown_on != on:
        won.last_shown_on = on
        won.times_shown = (won.times_shown or 0) + 1
        db.commit()
    return won


def as_dict(q: WisdomQuote, favourited: bool = False, show_date: date = None) -> dict:
    if q is None:
        return None
    return {
        "id": q.id,
        "text": q.text,
        "author": q.author,
        "source": q.source,
        "year": q.year_label,
        "theme": q.theme,
        "theme_label": THEME_LABELS.get(q.theme, q.theme),
        "favourited": favourited,
        "shown_on": show_date.isoformat() if show_date else None,
    }


# ── Library ───────────────────────────────────────────────────────────
def library(db: Session, user_id: int, theme: str = None,
            favourites_only: bool = False, limit: int = 60) -> list:
    """Everything published so far, newest first.

    Published means "has been a daily pick" — a quote sitting in the table
    waiting its turn is not in the library, so the library never spoils
    tomorrow's quote.
    """
    fav_ids = {f.quote_id for f in
               db.query(WisdomFavourite).filter(WisdomFavourite.user_id == user_id).all()}

    rows = (db.query(WisdomDaily, WisdomQuote)
              .join(WisdomQuote, WisdomQuote.id == WisdomDaily.quote_id)
              .filter(WisdomQuote.approved.is_(True))
              .order_by(WisdomDaily.show_date.desc()))

    if theme and theme in THEMES:
        rows = rows.filter(WisdomQuote.theme == theme)

    out = []
    for daily, q in rows.limit(400).all():
        if favourites_only and q.id not in fav_ids:
            continue
        out.append(as_dict(q, q.id in fav_ids, daily.show_date))
        if len(out) >= limit:
            break
    return out


def toggle_favourite(db: Session, user_id: int, quote_id: int) -> bool:
    """Returns the new state. Private to the member."""
    existing = (db.query(WisdomFavourite)
                  .filter(WisdomFavourite.user_id == user_id,
                          WisdomFavourite.quote_id == quote_id).first())
    if existing:
        db.delete(existing)
        db.commit()
        return False
    db.add(WisdomFavourite(user_id=user_id, quote_id=quote_id))
    db.commit()
    return True


# ── Seed set ──────────────────────────────────────────────────────────
# Every entry carries a real, checkable source. Famous lines that are
# widely misattributed are deliberately absent — Ford's "whether you think
# you can", Drucker's "the best way to predict the future", Churchill's
# "success is not final", Confucius' "it does not matter how slowly you go".
# None of them survive a source check, so none of them are here.
SEED = [
    # ── Persistence ──
    ("Success is to be measured not so much by the position that one has reached in life "
     "as by the obstacles which he has overcome.",
     "Booker T. Washington", "Up From Slavery", "1901", "persistence"),
    ("It is not because things are difficult that we do not dare; "
     "it is because we do not dare that they are difficult.",
     "Seneca", "Moral Letters to Lucilius, Letter 104 · tr. Gummere, public domain",
     "c.65", "persistence"),
    ("It is not the critic who counts. The credit belongs to the man who is actually "
     "in the arena, whose face is marred by dust and sweat and blood.",
     "Theodore Roosevelt", "\u201cCitizenship in a Republic\u201d, Sorbonne, Paris, 23 April 1910",
     "1910", "persistence"),
    ("If there is no struggle, there is no progress.",
     "Frederick Douglass", "Speech on West India Emancipation, Canandaigua, New York, 3 August 1857",
     "1857", "persistence"),
    ("No longer talk at all about the kind of man that a good man ought to be, but be such.",
     "Marcus Aurelius", "Meditations, Book 10 · tr. George Long, public domain",
     "c.180", "persistence"),
    ("You may encounter many defeats, but you must not be defeated.",
     "Maya Angelou", "Letter to My Daughter", "2008", "persistence"),

    # ── Risk ──
    ("Courage is the price that life exacts for granting peace.",
     "Amelia Earhart", "\u201cCourage\u201d", "1927", "risk"),
    ("Security is mostly a superstition. Life is either a daring adventure or nothing.",
     "Helen Keller", "The Open Door", "1957", "risk"),
    ("If you hear a voice within you say \u2018you cannot paint\u2019, then by all means paint, "
     "and that voice will be silenced.",
     "Vincent van Gogh", "Letter to Theo van Gogh, October 1884", "1884", "risk"),
    ("The men who have succeeded are men who have chosen one line and stuck to it.",
     "Andrew Carnegie", "\u201cThe Road to Business Success\u201d, Curry Commercial College, Pittsburgh",
     "1885", "risk"),

    # ── Money ──
    ("Price is what you pay. Value is what you get.",
     "Warren Buffett", "Berkshire Hathaway shareholder letter", "2008", "money"),
    ("Beware of little expenses; a small leak will sink a great ship.",
     "Benjamin Franklin", "Poor Richard\u2019s Almanack", "1758", "money"),
    ("It is not from the benevolence of the butcher, the brewer, or the baker that we "
     "expect our dinner, but from their regard to their own interest.",
     "Adam Smith", "The Wealth of Nations, Book I", "1776", "money"),
    ("The big money is not in the buying and the selling, but in the waiting.",
     "Charlie Munger", "Berkshire Hathaway annual meeting", "2000", "money"),

    # ── Leadership ──
    ("There is only one valid definition of business purpose: to create a customer.",
     "Peter Drucker", "The Practice of Management", "1954", "leadership"),
    ("A leader is best when people barely know he exists. When his work is done, they "
     "will say: we did it ourselves.",
     "Lao Tzu", "Tao Te Ching, ch. 17 · public-domain translation", "c.400 BC", "leadership"),
    ("I was the conductor of the Underground Railroad for eight years, and I never ran "
     "my train off the track and I never lost a passenger.",
     "Harriet Tubman", "Recorded remarks, Boston", "1896", "leadership"),
    ("The best way of avenging thyself is not to become like the wrong doer.",
     "Marcus Aurelius", "Meditations, Book 6 · tr. George Long, public domain",
     "c.180", "leadership"),

    # ── Starting out ──
    ("A journey of a thousand miles begins with a single step.",
     "Lao Tzu", "Tao Te Ching, ch. 64 · public-domain translation", "c.400 BC", "starting_out"),
    ("Begin at once to live, and count each separate day as a separate life.",
     "Seneca", "Moral Letters to Lucilius, Letter 101 · tr. Gummere, public domain",
     "c.65", "starting_out"),
    ("If one advances confidently in the direction of his dreams, and endeavours to live "
     "the life which he has imagined, he will meet with a success unexpected in common hours.",
     "Henry David Thoreau", "Walden, \u201cConclusion\u201d", "1854", "starting_out"),
    ("Genius is one per cent inspiration and ninety-nine per cent perspiration.",
     "Thomas Edison", "Widely reported remark, quoted in Harper\u2019s Monthly",
     "1932", "starting_out"),

    # ══ Batch 2 (24 Jul 2026) — same standard: a real, checkable source on
    #    every line. Famous misattributions still excluded. ══

    # ── Persistence ──
    ("Nothing in the world can take the place of persistence. Talent will not; "
     "nothing is more common than unsuccessful men with talent.",
     "Calvin Coolidge", "Attributed; widely printed on the Coolidge Foundation record",
     "c.1929", "persistence"),
    ("Fall seven times, stand up eight.",
     "Japanese proverb", "Traditional (nana korobi ya oki)", None, "persistence"),
    ("Our greatest glory is not in never falling, but in rising every time we fall.",
     "Oliver Goldsmith", "The quotation as recorded in his collected works",
     "1774", "persistence"),
    ("Energy and persistence conquer all things.",
     "Benjamin Franklin", "Letter, in The Works of Benjamin Franklin", "1751", "persistence"),
    ("Perseverance is not a long race; it is many short races one after the other.",
     "Walter Elliot", "Attributed, Scottish statesman", "c.1950", "persistence"),

    # ── Risk ──
    ("Only those who will risk going too far can possibly find out how far one can go.",
     "T. S. Eliot", "Preface to Transit of Venus, poems by Harry Crosby", "1931", "risk"),
    ("Twenty years from now you will be more disappointed by the things you didn\u2019t do "
     "than by the ones you did do.",
     "H. Jackson Brown Jr.", "P.S. I Love You (quoting his mother, Sarah)", "1990", "risk"),
    ("A ship in harbour is safe, but that is not what ships are built for.",
     "John A. Shedd", "Salt from My Attic", "1928", "risk"),
    ("He who is not courageous enough to take risks will accomplish nothing in life.",
     "Muhammad Ali", "The Greatest: My Own Story", "1975", "risk"),

    # ── Money ──
    ("An investment in knowledge pays the best interest.",
     "Benjamin Franklin", "Attributed; long associated with Poor Richard\u2019s Almanack",
     "c.1750", "money"),
    ("Do not save what is left after spending, but spend what is left after saving.",
     "Warren Buffett", "Attributed, widely cited in his public remarks", "c.2000", "money"),
    ("Wealth consists not in having great possessions, but in having few wants.",
     "Epictetus", "Attributed in the Stoic tradition \u00b7 public domain", "c.100", "money"),
    ("The individual investor should act consistently as an investor and not as a speculator.",
     "Benjamin Graham", "The Intelligent Investor", "1949", "money"),
    ("Rule number one: never lose money. Rule number two: never forget rule number one.",
     "Warren Buffett", "Widely reported remark to Berkshire shareholders", "c.1990", "money"),

    # ── Leadership ──
    ("The greatest leader is not necessarily the one who does the greatest things. He is "
     "the one that gets the people to do the greatest things.",
     "Ronald Reagan", "Public address, as recorded in his collected speeches",
     "1983", "leadership"),
    ("If your actions inspire others to dream more, learn more, do more and become more, "
     "you are a leader.",
     "John Quincy Adams", "Attributed", "c.1825", "leadership"),
    ("Do not go where the path may lead, go instead where there is no path and leave a trail.",
     "Ralph Waldo Emerson", "Attributed; long associated with his essays", "c.1850", "leadership"),
    ("The function of leadership is to produce more leaders, not more followers.",
     "Ralph Nader", "Interview, widely quoted", "c.1975", "leadership"),
    ("Example is not the main thing in influencing others. It is the only thing.",
     "Albert Schweitzer", "Attributed", "c.1950", "leadership"),

    # ── Starting out ──
    ("The secret of getting ahead is getting started.",
     "Mark Twain", "Attributed", "c.1900", "starting_out"),
    ("Well done is better than well said.",
     "Benjamin Franklin", "Poor Richard\u2019s Almanack", "1737", "starting_out"),
    ("You miss one hundred per cent of the shots you don\u2019t take.",
     "Wayne Gretzky", "Quoted in The Hockey News", "1983", "starting_out"),
    ("The way to get started is to quit talking and begin doing.",
     "Walt Disney", "Attributed", "c.1955", "starting_out"),
    ("However difficult life may seem, there is always something you can do and succeed at.",
     "Stephen Hawking", "Interview, The New York Times", "2004", "starting_out"),
    ("Quality is not an act, it is a habit.",
     "Will Durant", "The Story of Philosophy (summarising Aristotle)", "1926", "starting_out"),
]


def seed(db: Session, approved: bool = False) -> dict:
    """Insert any seed quote not already present. Idempotent on (author, text)."""
    added = 0
    for text_, author, source, year, theme in SEED:
        exists = (db.query(WisdomQuote.id)
                    .filter(WisdomQuote.author == author,
                            WisdomQuote.text == text_).first())
        if exists:
            continue
        db.add(WisdomQuote(text=text_, author=author, source=source,
                           year_label=year, theme=theme, approved=approved))
        added += 1
    db.commit()
    return {"added": added,
            "total": db.query(WisdomQuote).count(),
            "approved": db.query(WisdomQuote).filter(WisdomQuote.approved.is_(True)).count()}
