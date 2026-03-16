/**
 * SuperAdPro Public Page i18n
 * Lightweight translation system for Jinja2/static pages.
 * 
 * Usage: Add data-i18n="key" attribute to any element.
 * The script reads the language from localStorage and swaps text.
 * 
 * Example: <h1 data-i18n="hero.title">Earn. Learn. Build.</h1>
 */

(function() {
  // All translations for public pages
  var T = {
    en: {
      // Nav
      "nav.howItWorks": "How It Works",
      "nav.adBoard": "Ad Board",
      "nav.login": "Login",
      "nav.register": "Get Started",
      "nav.getStarted": "Get Started →",
      "nav.seeHow": "See How It Works",
      
      // Hero
      "hero.eyebrow": "The All-In-One Platform",
      "hero.title1": "Earn. Learn. Build.",
      "hero.title2": "Your Online Business.",
      "hero.sub": "SuperAdPro gives you 4 income streams, a course marketplace, and AI-powered marketing tools — all in one platform. Built for marketers, entrepreneurs, and online business builders.",
      
      // Stats
      "stats.incomeStreams": "Income Streams",
      "stats.membershipCommission": "Membership Commission",
      "stats.courseCommission": "Course Commission",
      "stats.campaignTiers": "Campaign Tiers",
      "stats.fromMonth": "From / Month",
      
      // Earn Learn Build
      "elb.superTitle": "THE SUPERADPRO WAY",
      "elb.title": "Three Pillars. One Platform.",
      "elb.sub": "Everything you need to start earning, learning, and building — without juggling a dozen different tools.",
      "elb.earn": "Earn",
      "elb.earnDesc": "4 income streams: 50% membership commissions, 8-tier grid campaigns, 100% course referrals, and your own course marketplace.",
      "elb.learn": "Learn",
      "elb.learnDesc": "Browse platform courses or create and sell your own on the marketplace. Keep 50% of every sale you make. Learn skills that translate into income.",
      "elb.build": "Build",
      "elb.buildDesc": "SuperPages builder, LinkHub, AI Funnel Generator, email autoresponder, and more. Professional marketing tools without the professional price tag.",
      "elb.seeBreakdown": "See full breakdown — How It Works →",
      
      // Explore
      "explore.superTitle": "EXPLORE SUPERADPRO",
      "explore.title": "Free Public Content That Drives Traffic",
      "explore.sub": "Our Ad Board and Video Library are public, SEO-indexed, and designed to bring organic traffic to the platform — and to your listings.",
      "explore.adBoardTitle": "Ad Board",
      "explore.adBoardDesc": "A public, SEO-indexed community marketplace. Post unlimited listings for free — every ad gets its own Google-indexed page with structured data and a shareable URL.",
      "explore.browseAds": "Browse the Ad Board →",
      "explore.videoTitle": "Video Library",
      "explore.videoDesc": "Watch campaign videos from advertisers and earn rewards. A public-facing video library that brings organic viewers to the platform and generates real engagement for advertisers.",
      "explore.watchVideos": "Watch Videos →",
      
      // Mission
      "mission.superTitle": "Our Mission",
      "mission.title1": "Built for People.",
      "mission.title2": "The People's Platform.",
      "mission.desc": "We created SuperAdPro with a simple belief: that ordinary people deserve genuine opportunities to build additional income — especially in difficult and uncertain times. Not hype. Not false promises. A real platform with real tools, transparent earnings, and a community where 95% of every dollar flows back to the members who make it work.",
      "mission.lowBarrier": "Low barrier to entry.",
      "mission.lowBarrierDesc": "From $20/month (Basic) or $30/month (Pro) — unlocking four income streams, AI marketing tools, and a global community.",
      "mission.builtToShare": "Built to share, not to hoard.",
      "mission.builtToShareDesc": "The majority of all revenue flows back to members through commissions, course sales, and grid payouts. This isn't a company extracting from its users — it's a system designed to distribute.",
      "mission.tools": "Tools that do the heavy lifting.",
      "mission.toolsDesc": "Not everyone knows how to market. That's why every member gets AI-powered tools to find their niche, write content, build funnels and launch campaigns — no experience needed.",
      
      // CTA
      "cta.title": "Ready to Start Building?",
      "cta.sub": "Join thousands of members earning, learning, and building with SuperAdPro.",
      "cta.btn": "Create Your Free Account →",
      "cta.note": "No credit card required",
      "cta.fromPrice": "From $20/month",
      
      // Footer
      "footer.adBoard": "Ad Board",
      "footer.legal": "Legal",
      "footer.faq": "FAQ",
      "footer.howItWorks": "How It Works",
      "footer.support": "Support",
      
      // Login
      "login.title": "Welcome Back",
      "login.sub": "Sign in to your SuperAdPro account",
      "login.email": "Email or Username",
      "login.password": "Password",
      "login.btn": "Sign In",
      "login.noAccount": "Don't have an account?",
      "login.register": "Create one here",
      
      // Register
      "register.title": "Join SuperAdPro",
      "register.sub": "Start earning, learning, and building today",
      "register.firstName": "First Name",
      "register.lastName": "Last Name",
      "register.email": "Email Address",
      "register.username": "Choose Username",
      "register.password": "Password",
      "register.confirmPassword": "Confirm Password",
      "register.btn": "Create Account →",
      "register.haveAccount": "Already have an account?",
      "register.login": "Sign in here",
      "register.referredBy": "Referred by",
    },
    
    es: {
      "nav.howItWorks": "Cómo Funciona",
      "nav.adBoard": "Tablón de Anuncios",
      "nav.login": "Iniciar Sesión",
      "nav.register": "Empezar",
      "nav.getStarted": "Empezar →",
      "nav.seeHow": "Ver Cómo Funciona",
      "hero.eyebrow": "La Plataforma Todo en Uno",
      "hero.title1": "Gana. Aprende. Construye.",
      "hero.title2": "Tu Negocio Online.",
      "hero.sub": "SuperAdPro te da 4 fuentes de ingresos, un mercado de cursos y herramientas de marketing con IA — todo en una plataforma. Hecho para marketers, emprendedores y creadores de negocios online.",
      "stats.incomeStreams": "Fuentes de Ingresos",
      "stats.membershipCommission": "Comisión de Membresía",
      "stats.courseCommission": "Comisión de Cursos",
      "stats.campaignTiers": "Niveles de Campaña",
      "stats.fromMonth": "Desde / Mes",
      "elb.superTitle": "EL MÉTODO SUPERADPRO",
      "elb.title": "Tres Pilares. Una Plataforma.",
      "elb.sub": "Todo lo que necesitas para empezar a ganar, aprender y construir — sin malabarear una docena de herramientas.",
      "elb.earn": "Gana",
      "elb.earnDesc": "4 fuentes de ingresos: 50% comisiones de membresía, campañas de grid de 8 niveles, 100% referidos de cursos y tu propio mercado de cursos.",
      "elb.learn": "Aprende",
      "elb.learnDesc": "Navega cursos de la plataforma o crea y vende los tuyos en el mercado. Quédate con el 50% de cada venta. Aprende habilidades que se traducen en ingresos.",
      "elb.build": "Construye",
      "elb.buildDesc": "Constructor SuperPages, LinkHub, Generador de Funnels con IA, autoresponder de email y más. Herramientas profesionales de marketing sin el precio profesional.",
      "elb.seeBreakdown": "Ver desglose completo — Cómo Funciona →",
      "explore.superTitle": "EXPLORA SUPERADPRO",
      "explore.title": "Contenido Público Gratuito Que Genera Tráfico",
      "explore.sub": "Nuestro Tablón de Anuncios y Biblioteca de Videos son públicos, indexados por SEO, y diseñados para traer tráfico orgánico a la plataforma — y a tus listados.",
      "explore.adBoardTitle": "Tablón de Anuncios",
      "explore.adBoardDesc": "Un mercado comunitario público, indexado por SEO. Publica listados ilimitados gratis — cada anuncio tiene su propia página indexada por Google con datos estructurados y URL compartible.",
      "explore.browseAds": "Explorar el Tablón →",
      "explore.videoTitle": "Biblioteca de Videos",
      "explore.videoDesc": "Mira videos de campañas de anunciantes y gana recompensas. Una biblioteca de videos pública que trae espectadores orgánicos a la plataforma y genera engagement real para anunciantes.",
      "explore.watchVideos": "Ver Videos →",
      "mission.superTitle": "Nuestra Misión",
      "mission.title1": "Hecho para la Gente.",
      "mission.title2": "La Plataforma del Pueblo.",
      "mission.desc": "Creamos SuperAdPro con una creencia simple: que la gente común merece oportunidades genuinas de construir ingresos adicionales — especialmente en tiempos difíciles e inciertos. Sin exageraciones. Sin falsas promesas. Una plataforma real con herramientas reales, ganancias transparentes y una comunidad donde el 95% de cada dólar vuelve a los miembros que la hacen funcionar.",
      "mission.lowBarrier": "Barrera de entrada baja.",
      "mission.lowBarrierDesc": "Desde $20/mes (Básico) o $30/mes (Pro) — desbloqueando cuatro fuentes de ingresos, herramientas de marketing con IA y una comunidad global.",
      "mission.builtToShare": "Hecho para compartir, no para acumular.",
      "mission.builtToShareDesc": "La mayoría de los ingresos vuelven a los miembros a través de comisiones, ventas de cursos y pagos del grid. No es una empresa que extrae de sus usuarios — es un sistema diseñado para distribuir.",
      "mission.tools": "Herramientas que hacen el trabajo pesado.",
      "mission.toolsDesc": "No todos saben marketing. Por eso cada miembro recibe herramientas con IA para encontrar su nicho, escribir contenido, construir funnels y lanzar campañas — sin experiencia necesaria.",
      "cta.title": "¿Listo para Empezar a Construir?",
      "cta.sub": "Únete a miles de miembros ganando, aprendiendo y construyendo con SuperAdPro.",
      "cta.btn": "Crea Tu Cuenta Gratis →",
      "cta.note": "No se requiere tarjeta de crédito",
      "cta.fromPrice": "Desde $20/mes",
      "footer.adBoard": "Tablón de Anuncios",
      "footer.legal": "Legal",
      "footer.faq": "Preguntas Frecuentes",
      "footer.howItWorks": "Cómo Funciona",
      "footer.support": "Soporte",
      "login.title": "Bienvenido de Vuelta",
      "login.sub": "Inicia sesión en tu cuenta SuperAdPro",
      "login.email": "Correo o Nombre de Usuario",
      "login.password": "Contraseña",
      "login.btn": "Iniciar Sesión",
      "login.noAccount": "¿No tienes cuenta?",
      "login.register": "Crea una aquí",
      "register.title": "Únete a SuperAdPro",
      "register.sub": "Empieza a ganar, aprender y construir hoy",
      "register.firstName": "Nombre",
      "register.lastName": "Apellido",
      "register.email": "Correo Electrónico",
      "register.username": "Elige un Nombre de Usuario",
      "register.password": "Contraseña",
      "register.confirmPassword": "Confirmar Contraseña",
      "register.btn": "Crear Cuenta →",
      "register.haveAccount": "¿Ya tienes cuenta?",
      "register.login": "Inicia sesión aquí",
      "register.referredBy": "Referido por",
    },

    fr: {
      "nav.howItWorks": "Comment Ça Marche",
      "nav.adBoard": "Tableau d'Annonces",
      "nav.login": "Connexion",
      "nav.register": "Commencer",
      "nav.getStarted": "Commencer →",
      "nav.seeHow": "Voir Comment Ça Marche",
      "hero.eyebrow": "La Plateforme Tout-en-Un",
      "hero.title1": "Gagnez. Apprenez. Construisez.",
      "hero.title2": "Votre Business en Ligne.",
      "hero.sub": "SuperAdPro vous offre 4 sources de revenus, un marché de cours et des outils marketing IA — le tout sur une seule plateforme. Conçu pour les marketeurs, entrepreneurs et créateurs de business en ligne.",
      "stats.incomeStreams": "Sources de Revenus",
      "stats.membershipCommission": "Commission Adhésion",
      "stats.courseCommission": "Commission Cours",
      "stats.campaignTiers": "Niveaux de Campagne",
      "stats.fromMonth": "À Partir de / Mois",
      "elb.superTitle": "LA MÉTHODE SUPERADPRO",
      "elb.title": "Trois Piliers. Une Plateforme.",
      "elb.sub": "Tout ce dont vous avez besoin pour commencer à gagner, apprendre et construire — sans jongler avec une douzaine d'outils.",
      "elb.earn": "Gagnez",
      "elb.earnDesc": "4 sources de revenus : 50% commissions d'adhésion, campagnes grid à 8 niveaux, 100% de parrainage de cours et votre propre marché de cours.",
      "elb.learn": "Apprenez",
      "elb.learnDesc": "Parcourez les cours ou créez et vendez les vôtres. Gardez 50% de chaque vente. Apprenez des compétences qui se traduisent en revenus.",
      "elb.build": "Construisez",
      "elb.buildDesc": "Constructeur SuperPages, LinkHub, Générateur de Funnels IA, autorépondeur email et plus. Des outils marketing professionnels sans le prix professionnel.",
      "cta.title": "Prêt à Commencer ?",
      "cta.sub": "Rejoignez des milliers de membres qui gagnent, apprennent et construisent avec SuperAdPro.",
      "cta.btn": "Créez Votre Compte Gratuit →",
      "cta.note": "Aucune carte de crédit requise",
      "cta.fromPrice": "À partir de 20$/mois",
      "login.title": "Bon Retour",
      "login.sub": "Connectez-vous à votre compte SuperAdPro",
      "login.email": "Email ou Nom d'utilisateur",
      "login.password": "Mot de passe",
      "login.btn": "Se Connecter",
      "register.title": "Rejoignez SuperAdPro",
      "register.sub": "Commencez à gagner, apprendre et construire aujourd'hui",
      "register.btn": "Créer un Compte →",
    },

    pt: {
      "nav.howItWorks": "Como Funciona",
      "nav.login": "Entrar",
      "nav.register": "Começar",
      "nav.getStarted": "Começar →",
      "hero.eyebrow": "A Plataforma Tudo-em-Um",
      "hero.title1": "Ganhe. Aprenda. Construa.",
      "hero.title2": "Seu Negócio Online.",
      "hero.sub": "SuperAdPro oferece 4 fontes de renda, um mercado de cursos e ferramentas de marketing com IA — tudo em uma plataforma. Feito para marketers, empreendedores e criadores de negócios online.",
      "cta.title": "Pronto para Começar a Construir?",
      "cta.btn": "Crie Sua Conta Grátis →",
      "login.title": "Bem-vindo de Volta",
      "login.btn": "Entrar",
      "register.title": "Junte-se ao SuperAdPro",
      "register.btn": "Criar Conta →",
    },

    de: {
      "nav.howItWorks": "So Funktioniert's",
      "nav.login": "Anmelden",
      "nav.register": "Loslegen",
      "nav.getStarted": "Loslegen →",
      "hero.eyebrow": "Die All-in-One-Plattform",
      "hero.title1": "Verdienen. Lernen. Aufbauen.",
      "hero.title2": "Dein Online-Business.",
      "hero.sub": "SuperAdPro bietet dir 4 Einkommensquellen, einen Kursmarktplatz und KI-gestützte Marketing-Tools — alles auf einer Plattform.",
      "cta.title": "Bereit zum Starten?",
      "cta.btn": "Kostenloses Konto Erstellen →",
      "login.title": "Willkommen Zurück",
      "login.btn": "Anmelden",
      "register.title": "SuperAdPro Beitreten",
      "register.btn": "Konto Erstellen →",
    },

    zh: {
      "nav.howItWorks": "如何运作",
      "nav.login": "登录",
      "nav.register": "开始",
      "nav.getStarted": "立即开始 →",
      "hero.eyebrow": "一体化平台",
      "hero.title1": "赚钱。学习。建造。",
      "hero.title2": "您的在线业务。",
      "hero.sub": "SuperAdPro 为您提供4种收入来源、课程市场和AI驱动的营销工具——一个平台搞定一切。",
      "cta.title": "准备开始了吗？",
      "cta.btn": "免费创建账户 →",
      "login.title": "欢迎回来",
      "login.btn": "登录",
      "register.title": "加入 SuperAdPro",
      "register.btn": "创建账户 →",
    },

    ar: {
      "nav.howItWorks": "كيف يعمل",
      "nav.login": "تسجيل الدخول",
      "nav.register": "ابدأ الآن",
      "nav.getStarted": "ابدأ الآن →",
      "hero.eyebrow": "المنصة المتكاملة",
      "hero.title1": "اكسب. تعلّم. ابنِ.",
      "hero.title2": "عملك على الإنترنت.",
      "hero.sub": "SuperAdPro يوفر لك 4 مصادر دخل وسوق دورات وأدوات تسويق بالذكاء الاصطناعي — كل شيء في منصة واحدة.",
      "cta.title": "مستعد للبدء؟",
      "cta.btn": "أنشئ حسابك المجاني →",
      "login.title": "مرحباً بعودتك",
      "login.btn": "تسجيل الدخول",
      "register.title": "انضم إلى SuperAdPro",
      "register.btn": "إنشاء حساب →",
    },

    ja: {
      "nav.howItWorks": "仕組み",
      "nav.login": "ログイン",
      "nav.register": "始める",
      "hero.eyebrow": "オールインワンプラットフォーム",
      "hero.title1": "稼ぐ。学ぶ。築く。",
      "hero.title2": "あなたのオンラインビジネス。",
      "cta.title": "始める準備はできましたか？",
      "cta.btn": "無料アカウント作成 →",
      "login.title": "おかえりなさい",
      "login.btn": "ログイン",
      "register.title": "SuperAdProに参加",
      "register.btn": "アカウント作成 →",
    },

    hi: {
      "nav.howItWorks": "कैसे काम करता है",
      "nav.login": "लॉगिन",
      "nav.register": "शुरू करें",
      "hero.eyebrow": "ऑल-इन-वन प्लेटफ़ॉर्म",
      "hero.title1": "कमाएं। सीखें। बनाएं।",
      "hero.title2": "आपका ऑनलाइन बिज़नेस।",
      "cta.title": "शुरू करने के लिए तैयार?",
      "cta.btn": "मुफ़्त अकाउंट बनाएं →",
      "login.title": "वापसी पर स्वागत",
      "login.btn": "लॉगिन",
      "register.title": "SuperAdPro से जुड़ें",
      "register.btn": "अकाउंट बनाएं →",
    },

    ko: {
      "hero.title1": "수익. 학습. 구축.",
      "hero.title2": "당신의 온라인 비즈니스.",
      "cta.title": "시작할 준비가 되셨나요?",
      "cta.btn": "무료 계정 만들기 →",
      "login.title": "다시 오신 것을 환영합니다",
      "login.btn": "로그인",
      "register.title": "SuperAdPro 가입",
      "register.btn": "계정 만들기 →",
    },

    ru: {
      "hero.title1": "Зарабатывай. Учись. Строй.",
      "hero.title2": "Свой онлайн-бизнес.",
      "cta.title": "Готовы начать?",
      "cta.btn": "Создать бесплатный аккаунт →",
      "login.title": "С возвращением",
      "login.btn": "Войти",
      "register.title": "Присоединяйтесь к SuperAdPro",
      "register.btn": "Создать аккаунт →",
    },

    tr: {
      "hero.title1": "Kazan. Öğren. İnşa Et.",
      "hero.title2": "Online İşini.",
      "cta.title": "Başlamaya Hazır mısınız?",
      "cta.btn": "Ücretsiz Hesap Oluştur →",
      "login.title": "Tekrar Hoş Geldiniz",
      "login.btn": "Giriş Yap",
      "register.title": "SuperAdPro'ya Katıl",
      "register.btn": "Hesap Oluştur →",
    },
  };

  function translate() {
    var lang = 'en';
    try { lang = localStorage.getItem('superadpro-lang') || 'en'; } catch(e) {}
    
    if (lang === 'en') return; // English is the default in HTML
    
    var dict = T[lang] || {};
    var els = document.querySelectorAll('[data-i18n]');
    els.forEach(function(el) {
      var key = el.getAttribute('data-i18n');
      if (dict[key]) {
        // Check if it's an input placeholder
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.setAttribute('placeholder', dict[key]);
        } else {
          el.textContent = dict[key];
        }
      }
    });

    // Set html lang attribute
    document.documentElement.lang = lang;
    
    // RTL for Arabic
    if (lang === 'ar') {
      document.documentElement.dir = 'rtl';
    }
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', translate);
  } else {
    translate();
  }
})();
