"""Folio design-system CSS, as a string, for server-rendered published pages.
Mirrors the front-end tokens + section styles so preview == published."""

FOLIO_CSS = r"""
@property --fo-accent{ syntax:'<color>'; inherits:true; initial-value:#5b3df5; }
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --fo-ink:#17141c;--fo-ink-3:#453d50;--fo-bone:#f6f2ea;--fo-bone-2:#efe9dd;--fo-paper:#fffdf8;
  --fo-iris:#5b3df5;--fo-ember:#ff5c39;--fo-halo:#f2b53c;--fo-mist:#8b8496;--fo-line:#e3dccd;--fo-line-dark:#332d3b;
  --fo-font-display:'Bricolage Grotesque','Inter',system-ui,sans-serif;--fo-font-body:'Inter',system-ui,sans-serif;--fo-font-mono:'Space Mono',monospace;
  --fo-text-lg:1.125rem;--fo-text-4xl:clamp(2.4rem,5vw,3.4rem);--fo-text-5xl:clamp(3rem,6.4vw,4.6rem);
  --fo-radius-sm:10px;--fo-radius-md:14px;--fo-radius-lg:20px;--fo-radius-pill:999px;
  --fo-shadow-md:0 14px 30px -16px rgba(23,20,28,.28);--fo-shadow-lg:0 30px 60px -30px rgba(23,20,28,.4);--fo-shadow-float:0 40px 80px -40px rgba(23,20,28,.5);
  --fo-ease-spring:cubic-bezier(.16,1,.3,1);--fo-ease-out:cubic-bezier(.22,.7,.24,1);--fo-dur-fast:.16s;--fo-dur-base:.32s;--fo-dur-slow:.6s;
  --fo-container:1080px;--fo-gutter:32px;
}
.fo-page{--fo-accent:#5b3df5;--fo-accent-strong:color-mix(in srgb,var(--fo-accent) 78%,#000);--fo-accent-tint:color-mix(in srgb,var(--fo-accent) 62%,#fff);
  --fo-accent-soft:color-mix(in srgb,var(--fo-accent) 10%,#fff);--fo-accent-ink:#fff;--fo-surface:#f6f2ea;--fo-paper:#fffdf8;--fo-dark:#17181f;
  --fo-text:#17181f;--fo-text-soft:#3a3d4a;--fo-muted:#6b6e7c;--fo-line:#e6e1d6;
  background:var(--fo-surface);color:var(--fo-text);font-family:var(--fo-font-body);line-height:1.6}
.fo-wr{max-width:var(--fo-container);margin:0 auto;padding:0 var(--fo-gutter)}
.fo-disp{font-family:var(--fo-font-display);font-weight:800;letter-spacing:-.03em;line-height:1.03}
.fo-eyebrow{font-family:var(--fo-font-mono);font-size:.75rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--fo-accent)}
.fo-lede{font-size:var(--fo-text-lg);color:var(--fo-text-soft);line-height:1.5}
.fo-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:var(--fo-font-body);font-weight:800;font-size:1rem;background:var(--fo-accent);color:var(--fo-accent-ink);border:none;border-radius:var(--fo-radius-sm);padding:14px 24px;cursor:pointer;text-decoration:none;box-shadow:0 14px 26px -12px color-mix(in srgb,var(--fo-accent) 55%,transparent)}
.fo-btn--ghost{background:transparent;color:var(--fo-text);border:1.5px solid var(--fo-line);box-shadow:none}
.fo-btn--light{background:#fff;color:var(--fo-accent);box-shadow:none}
.fo-input{flex:1;min-width:190px;border:1.5px solid var(--fo-line);background:var(--fo-paper);border-radius:var(--fo-radius-sm);padding:14px 15px;font-size:1rem;font-family:inherit;font-weight:500;color:var(--fo-text)}
.fo-form{display:flex;gap:9px;max-width:440px;flex-wrap:wrap}
.s{padding:110px 0}
.s-nav{position:sticky;top:0;z-index:5;background:color-mix(in srgb,var(--fo-surface) 84%,transparent);backdrop-filter:blur(10px);border-bottom:1px solid var(--fo-line)}
.s-nav .in{display:flex;align-items:center;justify-content:space-between;height:64px}
.fo-logo{display:flex;align-items:center;gap:9px;font-family:var(--fo-font-display);font-weight:800;font-size:18px}
.fo-logo .m{width:26px;height:26px;border-radius:8px;background:linear-gradient(135deg,var(--fo-accent),var(--fo-accent-tint));color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px}
.s-nav .links{display:flex;align-items:center;gap:24px;font-size:14px;font-weight:600;color:var(--fo-text-soft)}.s-nav .links a{color:inherit;text-decoration:none}
.s-hero .g{display:grid;grid-template-columns:1.05fr .95fr;gap:48px;align-items:center}
.s-hero h1{font-size:var(--fo-text-5xl);margin:14px 0 15px;font-family:var(--fo-font-display);font-weight:800;letter-spacing:-.03em;line-height:1.02}
.s-hero h1 .u{color:var(--fo-accent)}
.rea{display:flex;align-items:center;gap:12px;margin-top:20px}.avs{display:flex}.avs span{width:32px;height:32px;border-radius:50%;border:2.5px solid var(--fo-surface);margin-left:-10px;background-size:cover}.avs span:first-child{margin-left:0}
.rea .t{font-size:13px;color:var(--fo-muted)}.rea .t b{color:var(--fo-text)}.stars{color:var(--fo-halo)}
.cover-stage{display:flex;justify-content:center;perspective:1400px}
.cover{position:relative;width:270px;height:360px;transform:rotateY(-18deg) rotateX(4deg);border-radius:6px 12px 12px 6px;background:linear-gradient(135deg,var(--fo-accent),var(--fo-accent-tint) 55%,var(--fo-accent-strong));box-shadow:var(--fo-shadow-float);padding:28px 24px;color:#fff;display:flex;flex-direction:column}
.cover::before{content:'';position:absolute;left:0;top:0;bottom:0;width:14px;border-radius:6px 0 0 6px;background:rgba(0,0,0,.22)}
.cover .kk{font-size:9.5px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.7);font-family:var(--fo-font-mono)}
.cover .ct{font-family:var(--fo-font-display);font-weight:800;font-size:28px;line-height:1.05;margin-top:auto}
.cover .cs{font-size:12px;color:rgba(255,255,255,.85);margin-top:8px}
.cover .seal{position:absolute;top:-14px;right:-14px;width:68px;height:68px;border-radius:50%;background:var(--fo-halo);color:#5a3d00;display:flex;flex-direction:column;align-items:center;justify-content:center;transform:rotate(8deg);font-family:var(--fo-font-display);font-weight:800}.cover .seal b{font-size:16px;line-height:1}.cover .seal span{font-size:8px;letter-spacing:.06em;text-transform:uppercase}
.s-herocenter{text-align:center}.s-herocenter .badge{display:inline-block;background:var(--fo-accent-soft);color:var(--fo-accent);border-radius:var(--fo-radius-pill);padding:7px 15px;font-size:12.5px;font-weight:800;margin-bottom:20px}
.s-herocenter h1{font-family:var(--fo-font-display);font-weight:800;font-size:var(--fo-text-5xl);letter-spacing:-.03em;line-height:1.02;max-width:800px;margin:0 auto}.s-herocenter .fo-lede{max-width:560px;margin:18px auto 28px}.s-herocenter .btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.s-stats{background:var(--fo-dark);color:var(--fo-bone);padding:80px 0}.s-stats .g{display:grid;grid-template-columns:repeat(4,1fr);gap:24px;text-align:center}
.s-stats .n{font-family:var(--fo-font-display);font-weight:800;font-size:clamp(32px,5vw,50px);letter-spacing:-.03em;color:#fff}.s-stats .l{font-size:13px;color:#a6a8b8;margin-top:4px}
.s-features{background:var(--fo-dark);color:var(--fo-bone)}.s-features .fo-eyebrow{color:var(--fo-halo)}
.s-features h2{font-family:var(--fo-font-display);font-weight:800;font-size:var(--fo-text-4xl);letter-spacing:-.03em;line-height:1.05;margin:12px 0 0;max-width:600px}.s-features .sub{color:#a6a8b8;font-size:16px;margin-top:12px;max-width:520px}
.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:40px}.card{background:#20222c;border:1px solid #2c2f3a;border-radius:var(--fo-radius-md);padding:24px 22px}
.card .ic{width:42px;height:42px;border-radius:11px;background:color-mix(in srgb,var(--fo-accent) 22%,transparent);color:var(--fo-accent-tint);display:flex;align-items:center;justify-content:center;font-size:19px;margin-bottom:14px}
.card h3{font-family:var(--fo-font-display);font-weight:700;font-size:17px;margin-bottom:7px}.card p{color:#a6a8b8;font-size:13.5px}
.s-featrow .g{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}
.s-featrow h2{font-family:var(--fo-font-display);font-weight:800;font-size:clamp(1.9rem,3.4vw,2.4rem);letter-spacing:-.01em;line-height:1.1;margin:12px 0 13px}
.s-featrow .chk{list-style:none;margin-top:16px}.s-featrow .chk li{display:flex;gap:10px;margin-bottom:10px;font-size:15px;color:var(--fo-text-soft)}.s-featrow .chk li::before{content:'\2713';color:var(--fo-accent);font-weight:900}
.s-featrow .shot{aspect-ratio:4/3;border-radius:var(--fo-radius-lg);background:linear-gradient(140deg,var(--fo-accent),var(--fo-accent-tint));box-shadow:var(--fo-shadow-lg);position:relative;overflow:hidden}
.s-featrow .shot::after{content:'';position:absolute;left:24px;right:24px;top:30px;height:14px;border-radius:7px;background:rgba(255,255,255,.55);box-shadow:0 36px 0 rgba(255,255,255,.4),0 64px 0 rgba(255,255,255,.26)}
.s-steps{background:var(--fo-bone-2)}.s-steps .head{text-align:center;margin-bottom:48px}.s-steps h2{font-family:var(--fo-font-display);font-weight:800;font-size:var(--fo-text-4xl);letter-spacing:-.03em;margin-top:12px}
.s-steps .g{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}.step{text-align:center;padding:0 12px}
.step .num{width:54px;height:54px;margin:0 auto 16px;border-radius:50%;background:var(--fo-accent);color:#fff;font-family:var(--fo-font-display);font-weight:800;font-size:21px;display:flex;align-items:center;justify-content:center;box-shadow:0 14px 26px -12px color-mix(in srgb,var(--fo-accent) 55%,transparent)}
.step h3{font-family:var(--fo-font-display);font-weight:700;font-size:18px;margin-bottom:7px}.step p{color:var(--fo-text-soft);font-size:14px}
.s-quote{text-align:center}.s-quote .q{font-family:var(--fo-font-display);font-weight:700;font-size:clamp(23px,3.6vw,36px);line-height:1.28;max-width:800px;margin:0 auto;letter-spacing:-.02em}
.s-quote .hl{background:linear-gradient(120deg,transparent 62%,color-mix(in srgb,var(--fo-accent) 22%,transparent) 62%)}
.qby{display:flex;align-items:center;justify-content:center;gap:12px;margin-top:26px}.qby .a{width:48px;height:48px;border-radius:50%;background-size:cover}.qby .n{text-align:left}.qby .n b{display:block;font-weight:700;font-size:15px}.qby .n span{font-size:13px;color:var(--fo-muted)}
.s-pricing .head{text-align:center;margin-bottom:44px}.s-pricing h2{font-family:var(--fo-font-display);font-weight:800;font-size:var(--fo-text-4xl);letter-spacing:-.03em;margin-top:12px}
.s-pricing .g{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;align-items:start}
.plan{background:var(--fo-paper);border:1px solid var(--fo-line);border-radius:var(--fo-radius-lg);padding:28px 24px}
.plan.feat{background:var(--fo-dark);color:var(--fo-bone);border-color:var(--fo-dark);transform:scale(1.03);box-shadow:var(--fo-shadow-lg);position:relative}
.plan .tag{position:absolute;top:15px;right:15px;background:var(--fo-accent);color:#fff;font-size:10px;font-weight:800;padding:4px 10px;border-radius:var(--fo-radius-pill);font-family:var(--fo-font-mono)}
.plan .pn{font-family:var(--fo-font-mono);font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--fo-muted)}.plan.feat .pn{color:#a6a8b8}
.plan .pr{font-family:var(--fo-font-display);font-weight:800;font-size:42px;letter-spacing:-.03em;margin:8px 0 2px}.plan .pr span{font-size:14px;color:var(--fo-muted);font-weight:600;font-family:var(--fo-font-body)}
.plan ul{list-style:none;margin:18px 0 22px}.plan li{display:flex;gap:9px;font-size:13.5px;margin-bottom:9px;color:var(--fo-text-soft)}.plan.feat li{color:#c7c9d4}.plan li::before{content:'\2713';color:var(--fo-accent);font-weight:900}.plan .fo-btn{width:100%}
.s-faq{background:var(--fo-bone-2)}.s-faq .g{max-width:720px;margin:0 auto}.s-faq h2{font-family:var(--fo-font-display);font-weight:800;font-size:var(--fo-text-4xl);letter-spacing:-.03em;text-align:center;margin-bottom:36px}
.qa{border-bottom:1px solid var(--fo-line)}.qa .qq{padding:20px 0;font-family:var(--fo-font-display);font-weight:700;font-size:18px;display:flex;justify-content:space-between;gap:16px}.qa .qq .ic{color:var(--fo-accent);font-size:22px}
.qa .a{color:var(--fo-text-soft);font-size:15px;line-height:1.6;padding:0 0 20px;margin-top:-6px}
.s-cta{background:linear-gradient(135deg,var(--fo-accent),var(--fo-accent-tint));color:#fff;text-align:center}
.s-cta h2{font-family:var(--fo-font-display);font-weight:800;font-size:var(--fo-text-4xl);letter-spacing:-.03em;max-width:700px;margin:0 auto 12px}.s-cta p{font-size:17px;color:rgba(255,255,255,.88);margin-bottom:24px}
.s-cta .fo-form{margin:0 auto;justify-content:center}.s-cta .fo-input{background:rgba(255,255,255,.16);border-color:rgba(255,255,255,.3);color:#fff}.s-cta .fine{font-size:13px;color:rgba(255,255,255,.8);margin-top:14px}
.s-footer{background:var(--fo-dark);color:#8b8e9c;padding:52px 0 30px}.s-footer .g{display:grid;grid-template-columns:2fr 1fr 1fr;gap:32px;margin-bottom:32px}
.s-footer .about{max-width:250px;font-size:13px;line-height:1.6;margin-top:12px}.s-footer h4{color:#fff;font-family:var(--fo-font-display);font-weight:700;font-size:14px;margin-bottom:12px}.s-footer a{display:block;color:#8b8e9c;text-decoration:none;font-size:13px;margin-bottom:8px}
.s-footer .bot{border-top:1px solid var(--fo-line-dark);padding-top:18px;font-size:12px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px}
.s-bio{background:radial-gradient(120% 80% at 50% 0%,var(--fo-accent-soft),var(--fo-surface));text-align:center;padding:70px 0 60px}
.s-bio .av{width:104px;height:104px;border-radius:50%;margin:0 auto 18px;background-size:cover;border:4px solid #fff;box-shadow:var(--fo-shadow-md)}
.s-bio h1{font-family:var(--fo-font-display);font-weight:800;font-size:28px;letter-spacing:-.02em}.s-bio .h{color:var(--fo-muted);font-size:14px;margin:6px auto 24px;max-width:340px}
.s-bio .links{max-width:400px;margin:0 auto;display:flex;flex-direction:column;gap:12px;padding:0 24px}
.s-bio .lk{display:flex;align-items:center;justify-content:center;gap:10px;background:var(--fo-paper);border:1.5px solid var(--fo-line);border-radius:14px;padding:16px;font-weight:700;color:var(--fo-text);text-decoration:none}
.s-bio .lk.pri{background:var(--fo-accent);color:#fff;border-color:var(--fo-accent)}
.s-bio .soc{display:flex;gap:14px;justify-content:center;margin-top:28px}.s-bio .soc i{width:40px;height:40px;border-radius:50%;background:var(--fo-paper);border:1.5px solid var(--fo-line);display:flex;align-items:center;justify-content:center;color:var(--fo-text);font-style:normal;font-weight:700}
.s-web{background:var(--fo-dark);color:var(--fo-bone);padding:80px 0}.s-web .g{display:grid;grid-template-columns:1.1fr .9fr;gap:48px;align-items:center}
.s-web .date{display:inline-flex;gap:10px;align-items:center;background:color-mix(in srgb,var(--fo-accent) 22%,transparent);color:var(--fo-accent-tint);border-radius:var(--fo-radius-pill);padding:8px 15px;font-weight:800;font-size:13px;font-family:var(--fo-font-mono);letter-spacing:.05em}
.s-web h1{font-family:var(--fo-font-display);font-weight:800;font-size:clamp(2.2rem,4.4vw,3.2rem);letter-spacing:-.03em;line-height:1.05;margin:16px 0 14px}
.s-web .fo-lede{color:#b8b1c2}.s-web .card{background:#20222c;border:1px solid #2c2f3a;border-radius:var(--fo-radius-lg);padding:28px}
.s-web .card h4{font-family:var(--fo-font-display);font-weight:700;font-size:18px;margin-bottom:14px}.s-web .card .fo-input{background:#171921;border-color:#2c2f3a;color:#fff;width:100%;margin-bottom:10px}
.s-web .card .fo-btn{width:100%}.s-web .learn{list-style:none;margin-top:18px}.s-web .learn li{display:flex;gap:10px;font-size:14px;margin-bottom:9px;color:#c7c1d0}.s-web .learn li::before{content:'\2713';color:var(--fo-accent-tint);font-weight:900}
.s-coming{background:var(--fo-dark);color:var(--fo-bone);display:flex;flex-direction:column;justify-content:center;text-align:center;padding:120px 0}
.s-coming .fo-logo{justify-content:center;color:#fff;margin-bottom:30px}
.s-coming h1{font-family:var(--fo-font-display);font-weight:800;font-size:clamp(2.6rem,6vw,4.6rem);letter-spacing:-.04em;line-height:1;max-width:760px;margin:0 auto}
.s-coming h1 .u{color:var(--fo-accent-tint)}.s-coming p{color:#a6a8b8;font-size:18px;margin:18px auto 30px;max-width:460px}
.s-coming .fo-form{margin:0 auto;justify-content:center}.s-coming .fo-input{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.18);color:#fff}
.s-coming .soon{margin-top:26px;font-family:var(--fo-font-mono);font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--fo-mist)}
.s-thanks{text-align:center;padding:90px 0 40px}.s-thanks .tick{width:78px;height:78px;border-radius:50%;background:var(--fo-accent);color:#fff;display:flex;align-items:center;justify-content:center;font-size:38px;margin:0 auto 24px;box-shadow:0 18px 34px -14px color-mix(in srgb,var(--fo-accent) 55%,transparent)}
.s-thanks h1{font-family:var(--fo-font-display);font-weight:800;font-size:var(--fo-text-4xl);letter-spacing:-.03em}.s-thanks .fo-lede{max-width:520px;margin:16px auto 0}
.s-thanks .vid{max-width:620px;margin:36px auto 0;aspect-ratio:16/9;border-radius:var(--fo-radius-lg);background:linear-gradient(140deg,var(--fo-accent),var(--fo-accent-tint));box-shadow:var(--fo-shadow-lg);display:flex;align-items:center;justify-content:center}
.fo-thanks{font-family:var(--fo-font-display);font-weight:700;font-size:18px;color:var(--fo-accent);padding:12px 0}
.s-thanks .vid .play{width:66px;height:66px;border-radius:50%;background:rgba(255,255,255,.9);display:flex;align-items:center;justify-content:center;color:var(--fo-accent);font-size:24px;padding-left:5px}
@media(max-width:820px){
  .s-hero .g,.s-featrow .g,.s-web .g{grid-template-columns:1fr;gap:34px}.cover-stage{order:-1}
  .cards,.s-steps .g,.s-pricing .g{grid-template-columns:1fr}.s-stats .g{grid-template-columns:1fr 1fr;gap:30px 16px}.s-footer .g{grid-template-columns:1fr 1fr}.plan.feat{transform:none}.s{padding:64px 0}
}
"""
