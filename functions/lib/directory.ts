export interface DirectoryFeed {
  id: string;
  title: string;
  description: string;
  url: string;
  siteUrl: string;
  category: string;
  icon: string;
  isPopular?: boolean;
}

export const CURATED_DIRECTORY: DirectoryFeed[] = [
  // ==========================================
  // ۱. فناوری و استارتاپ (Tech & Startups) - 20 items
  // ==========================================
  {
    id: 'hn',
    title: 'Hacker News',
    description: 'اخبار داغ و گفتگوهای برنامه‌نویسان و فعالان استارتاپ جهانی',
    url: 'https://news.ycombinator.com/rss',
    siteUrl: 'https://news.ycombinator.com',
    category: 'فناوری و استارتاپ',
    icon: 'terminal',
    isPopular: true
  },
  {
    id: 'techcrunch',
    title: 'TechCrunch',
    description: 'آخرین اخبار سرمایه‌گذاری خطرپذیر، استارتاپ‌ها و غول‌های فناوری',
    url: 'https://techcrunch.com/feed/',
    siteUrl: 'https://techcrunch.com',
    category: 'فناوری و استارتاپ',
    icon: 'zap',
    isPopular: true
  },
  {
    id: 'theverge',
    title: 'The Verge',
    description: 'فناوری، گجت‌ها، هوش مصنوعی و زندگی دیجیتال',
    url: 'https://www.theverge.com/rss/index.xml',
    siteUrl: 'https://www.theverge.com',
    category: 'فناوری و استارتاپ',
    icon: 'smartphone',
    isPopular: true
  },
  {
    id: 'arstechnica',
    title: 'Ars Technica',
    description: 'تحلیل‌های عمیق فنی، امنیت، سخت‌افزار و سیاست‌های فناوری',
    url: 'https://feeds.arstechnica.com/arstechnica/index',
    siteUrl: 'https://arstechnica.com',
    category: 'فناوری و استارتاپ',
    icon: 'cpu',
    isPopular: false
  },
  {
    id: 'digiato',
    title: 'دیجیاتو (Digiato)',
    description: 'پوشش جامع اخبار تکنولوژی، بررسی محصولات و اخبار استارتاپ‌های ایران',
    url: 'https://digiato.com/feed',
    siteUrl: 'https://digiato.com',
    category: 'فناوری و استارتاپ',
    icon: 'laptop',
    isPopular: true
  },
  {
    id: 'zoomit',
    title: 'زومیت (Zoomit)',
    description: 'بررسی تخصصی موبایل، لپ‌تاپ، مقالات علمی و رویدادهای فناوری',
    url: 'https://www.zoomit.ir/feed/',
    siteUrl: 'https://www.zoomit.ir',
    category: 'فناوری و استارتاپ',
    icon: 'monitor',
    isPopular: true
  },
  {
    id: 'engadget',
    title: 'Engadget',
    description: 'تازه‌ترین گجت‌ها، بازی‌های الکترونیکی و سرگرمی‌های دیجیتال',
    url: 'https://www.engadget.com/rss.xml',
    siteUrl: 'https://www.engadget.com',
    category: 'فناوری و استارتاپ',
    icon: 'smartphone',
    isPopular: true
  },
  {
    id: 'wired',
    title: 'Wired',
    description: 'بررسی تأثیر فناوری مدرن بر فرهنگ، اقتصاد و آینده جهان',
    url: 'https://www.wired.com/feed/rss',
    siteUrl: 'https://www.wired.com',
    category: 'فناوری و استارتاپ',
    icon: 'globe',
    isPopular: true
  },
  {
    id: 'venturebeat',
    title: 'VentureBeat',
    description: 'گزارش‌های معتبر از هوش مصنوعی سازمانی و تحولات دنیای کسب‌وکار دیجیتال',
    url: 'https://venturebeat.com/feed/',
    siteUrl: 'https://venturebeat.com',
    category: 'فناوری و استارتاپ',
    icon: 'trending-up',
    isPopular: false
  },
  {
    id: '9to5mac',
    title: '9to5Mac',
    description: 'پوشش تخصصی محصولات اپل، سیستم‌عامل‌های iOS، macOS و شایعات سخت‌افزاری',
    url: 'https://9to5mac.com/feed/',
    siteUrl: 'https://9to5mac.com',
    category: 'فناوری و استارتاپ',
    icon: 'apple',
    isPopular: false
  },
  {
    id: 'androidauthority',
    title: 'Android Authority',
    description: 'مرجع اخبار اندروید، گوشی‌های هوشمند و راهنماهای گجت‌ها',
    url: 'https://www.androidauthority.com/feed/',
    siteUrl: 'https://www.androidauthority.com',
    category: 'فناوری و استارتاپ',
    icon: 'smartphone',
    isPopular: false
  },
  {
    id: 'mashable',
    title: 'Mashable',
    description: 'اخبار و رسانه دیجیتال، شبکه‌های اجتماعی، فناوری و فرهنگ آنلاین',
    url: 'https://mashable.com/feeds/rss/all',
    siteUrl: 'https://mashable.com',
    category: 'فناوری و استارتاپ',
    icon: 'share-2',
    isPopular: false
  },
  {
    id: 'zdnet',
    title: 'ZDNet',
    description: 'تحلیل‌های تجاری برای مدیران آی‌تی، زیرساخت‌های ابری و فناوری اطلاعات',
    url: 'https://www.zdnet.com/news/rss.xml',
    siteUrl: 'https://www.zdnet.com',
    category: 'فناوری و استارتاپ',
    icon: 'server',
    isPopular: false
  },
  {
    id: 'tomshardware',
    title: "Tom's Hardware",
    description: 'تست بنچمارک پردازنده‌ها، کارت‌های گرافیک و تجهیزات سخت‌افزاری',
    url: 'https://www.tomshardware.com/feeds/all',
    siteUrl: 'https://www.tomshardware.com',
    category: 'فناوری و استارتاپ',
    icon: 'hard-drive',
    isPopular: false
  },
  {
    id: 'gsmarena',
    title: 'GSMArena',
    description: 'اطلاعات کامل و مقایسه فنی انواع تلفن‌های همراه و گجت‌های پوشیدنی',
    url: 'https://www.gsmarena.com/rss-news-reviews.php3',
    siteUrl: 'https://www.gsmarena.com',
    category: 'فناوری و استارتاپ',
    icon: 'tablet',
    isPopular: false
  },
  {
    id: 'producthunt',
    title: 'Product Hunt',
    description: 'معرفی روزانه محصولات جدید، ابزارهای کاربردی و استارتاپ‌های تازه متولد شده',
    url: 'https://www.producthunt.com/feed',
    siteUrl: 'https://www.producthunt.com',
    category: 'فناوری و استارتاپ',
    icon: 'compass',
    isPopular: true
  },
  {
    id: 'gadgetnews',
    title: 'گجت نیوز',
    description: 'اخبار سریع دنیای فناوری، اتومبیل‌های هوشمند و نجوم',
    url: 'https://gadgetnews.net/feed/',
    siteUrl: 'https://gadgetnews.net',
    category: 'فناوری و استارتاپ',
    icon: 'radio',
    isPopular: false
  },
  {
    id: 'farnet',
    title: 'فارنت (Farnet)',
    description: 'اخبار و ترفندهای تکنولوژی، عکاسی دیجیتال و گجت‌های هوشمند',
    url: 'https://farnet.io/feed/',
    siteUrl: 'https://farnet.io',
    category: 'فناوری و استارتاپ',
    icon: 'cpu',
    isPopular: false
  },
  {
    id: 'itresan',
    title: 'آی‌تی‌رسان',
    description: 'بررسی گوشی‌های موبایل، مقایسه‌های قیمتی و راهنمای خرید دیجیتال',
    url: 'https://itresan.com/feed',
    siteUrl: 'https://itresan.com',
    category: 'فناوری و استارتاپ',
    icon: 'rss',
    isPopular: false
  },
  {
    id: 'slashdot',
    title: 'Slashdot',
    description: 'اخبار اخبار برای نردها، جامعه متن‌باز و مباحث فناوری کلاسیک',
    url: 'https://rss.slashdot.org/Slashdot/slashdotMain',
    siteUrl: 'https://slashdot.org',
    category: 'فناوری و استارتاپ',
    icon: 'hash',
    isPopular: false
  },

  // ==========================================
  // ۲. هوش مصنوعی و داده (AI & Data) - 20 items
  // ==========================================
  {
    id: 'openai',
    title: 'OpenAI Blog',
    description: 'تازه‌ترین دستاوردها و مقالات پژوهشی تیم توسعه چت‌جی‌پی‌تی و مدل‌های زبانی',
    url: 'https://openai.com/news/rss.xml',
    siteUrl: 'https://openai.com/news',
    category: 'هوش مصنوعی و داده',
    icon: 'sparkles',
    isPopular: true
  },
  {
    id: 'mit-tech-review',
    title: 'MIT Technology Review',
    description: 'تحلیل‌های موثق درباره آینده هوش مصنوعی، بیوتکنولوژی و رایانش',
    url: 'https://www.technologyreview.com/feed/',
    siteUrl: 'https://www.technologyreview.com',
    category: 'هوش مصنوعی و داده',
    icon: 'award',
    isPopular: true
  },
  {
    id: 'huggingface',
    title: 'Hugging Face Blog',
    description: 'نوآوری‌های جامعه یادگیری ماشین متن‌باز، ترنسفورمرها و دیتاست‌ها',
    url: 'https://huggingface.co/blog/feed.xml',
    siteUrl: 'https://huggingface.co/blog',
    category: 'هوش مصنوعی و داده',
    icon: 'smile',
    isPopular: true
  },
  {
    id: 'google-ai-blog',
    title: 'Google AI Blog',
    description: 'مقالات علمی و دستاوردهای بنیادین پژوهشگران گوگل در حوزه هوش مصنوعی',
    url: 'https://blog.google/technology/ai/rss/',
    siteUrl: 'https://blog.google/technology/ai/',
    category: 'هوش مصنوعی و داده',
    icon: 'search',
    isPopular: true
  },
  {
    id: 'deepmind-blog',
    title: 'Google DeepMind',
    description: 'پیشرفت‌های برجسته در مدل‌های هوش جامع مصنوعی (AGI) و علم رایانش',
    url: 'https://deepmind.google/blog/rss.xml',
    siteUrl: 'https://deepmind.google/blog/',
    category: 'هوش مصنوعی و داده',
    icon: 'cpu',
    isPopular: true
  },
  {
    id: 'marktechpost',
    title: 'MarkTechPost',
    description: 'خلاصه‌های کاربردی مقالات هوش مصنوعی، مدل‌های تولیدی و ابزارهای توسعه‌دهندگان',
    url: 'https://www.marktechpost.com/feed/',
    siteUrl: 'https://www.marktechpost.com',
    category: 'هوش مصنوعی و داده',
    icon: 'newspaper',
    isPopular: false
  },
  {
    id: 'towards-data-science',
    title: 'Towards Data Science',
    description: 'هزاران مقاله تخصصی علم داده، یادگیری عمیق، پایتون و ریاضیات داده',
    url: 'https://towardsdatascience.com/feed',
    siteUrl: 'https://towardsdatascience.com',
    category: 'هوش مصنوعی و داده',
    icon: 'bar-chart-2',
    isPopular: true
  },
  {
    id: 'kdnuggets',
    title: 'KDnuggets',
    description: 'پایگاه باسابقه مقالات یادگیری ماشین، هوش تجاری و ابزارهای مهندسی داده',
    url: 'https://www.kdnuggets.com/feed',
    siteUrl: 'https://www.kdnuggets.com',
    category: 'هوش مصنوعی و داده',
    icon: 'database',
    isPopular: false
  },
  {
    id: 'the-gradient',
    title: 'The Gradient',
    description: 'دیدگاه‌های متفکرانه، مصاحبه‌های عمیق و مقالات پژوهشگران پیشرو هوش مصنوعی',
    url: 'https://thegradient.pub/rss/',
    siteUrl: 'https://thegradient.pub',
    category: 'هوش مصنوعی و داده',
    icon: 'book-open',
    isPopular: false
  },
  {
    id: 'ml-mastery',
    title: 'Machine Learning Mastery',
    description: 'آموزش‌های گام‌به‌گام و کد-محور الگوریتم‌های یادگیری ماشین کاربردی',
    url: 'https://machinelearningmastery.com/feed/',
    siteUrl: 'https://machinelearningmastery.com',
    category: 'هوش مصنوعی و داده',
    icon: 'award',
    isPopular: false
  },
  {
    id: 'bair-blog',
    title: 'BAIR (Berkeley AI Research)',
    description: 'وبلاگ رسمی آزمایشگاه پژوهش‌های هوش مصنوعی دانشگاه برکلی کالیفرنیا',
    url: 'https://bair.berkeley.edu/blog/feed.xml',
    siteUrl: 'https://bair.berkeley.edu/blog/',
    category: 'هوش مصنوعی و داده',
    icon: 'graduation-cap',
    isPopular: false
  },
  {
    id: 'stability-ai',
    title: 'Stability AI',
    description: 'اخبار و عرضه‌های مربوط به مدل‌های متن‌باز Stable Diffusion و هوش مصنوعی تصویر',
    url: 'https://stability.ai/news?format=rss',
    siteUrl: 'https://stability.ai',
    category: 'هوش مصنوعی و داده',
    icon: 'image',
    isPopular: false
  },
  {
    id: 'anthropic-news',
    title: 'Anthropic Research',
    description: 'تحقیقات کلیدی درباره ایمنی هوش مصنوعی، مدل‌های Claude و تراز محاسباتی',
    url: 'https://www.anthropic.com/news/rss.xml',
    siteUrl: 'https://www.anthropic.com/news',
    category: 'هوش مصنوعی و داده',
    icon: 'shield-check',
    isPopular: true
  },
  {
    id: 'analytics-vidhya',
    title: 'Analytics Vidhya',
    description: 'جامعه بین‌المللی متخصصان تحلیل داده، رقابت‌های تحلیلی و آموزش مهارت‌های نو',
    url: 'https://www.analyticsvidhya.com/feed/',
    siteUrl: 'https://www.analyticsvidhya.com',
    category: 'هوش مصنوعی و داده',
    icon: 'trending-up',
    isPopular: false
  },
  {
    id: 'ai-news',
    title: 'Artificial Intelligence News',
    description: 'پوشش اخبار تجاری و صنعتی پیاده‌سازی هوش مصنوعی در شرکت‌های بزرگ',
    url: 'https://www.artificialintelligence-news.com/feed/',
    siteUrl: 'https://www.artificialintelligence-news.com',
    category: 'هوش مصنوعی و داده',
    icon: 'activity',
    isPopular: false
  },
  {
    id: 'msft-ai',
    title: 'Microsoft AI Blog',
    description: 'تازه‌ترین سرویس‌های Copilot، سرویس‌های هوش ابری Azure و مقالات هوش مصنوعی',
    url: 'https://blogs.microsoft.com/ai/feed/',
    siteUrl: 'https://blogs.microsoft.com/ai/',
    category: 'هوش مصنوعی و داده',
    icon: 'layout',
    isPopular: false
  },
  {
    id: 'aws-ml-blog',
    title: 'AWS Machine Learning',
    description: 'معماری و راهکارهای پیاده‌سازی مدل‌های بزرگ زبانی در بستر ابری آمازون',
    url: 'https://aws.amazon.com/blogs/machine-learning/feed/',
    siteUrl: 'https://aws.amazon.com/blogs/machine-learning/',
    category: 'هوش مصنوعی و داده',
    icon: 'cloud',
    isPopular: false
  },
  {
    id: 'stanford-hai',
    title: 'Stanford HAI',
    description: 'مطالعات موسسه هوش مصنوعی انسان‌محور دانشگاه استنفورد درباره تأثیرات اجتماعی',
    url: 'https://hai.stanford.edu/news/rss.xml',
    siteUrl: 'https://hai.stanford.edu',
    category: 'هوش مصنوعی و داده',
    icon: 'book',
    isPopular: false
  },
  {
    id: 'latent-space',
    title: 'Latent Space AI',
    description: 'تحلیل‌های عمیق مهندسی هوش مصنوعی، مدل‌های تولیدی و مصاحبه با معماران AI',
    url: 'https://www.latent.space/feed',
    siteUrl: 'https://www.latent.space',
    category: 'هوش مصنوعی و داده',
    icon: 'layers',
    isPopular: true
  },
  {
    id: 'import-ai',
    title: 'Import AI',
    description: 'خبرنامه هفتگی جک کلارک از تازه‌های اثرگذار پژوهشی و خط مشی هوش مصنوعی',
    url: 'https://importai.substack.com/feed',
    siteUrl: 'https://importai.substack.com',
    category: 'هوش مصنوعی و داده',
    icon: 'mail',
    isPopular: false
  },

  // ==========================================
  // ۳. برنامه‌نویسی و مهندسی نرم‌افزار (Programming & Software) - 20 items
  // ==========================================
  {
    id: 'github-blog',
    title: 'GitHub Blog',
    description: 'به‌روزرسانی‌های جامعه متن‌باز، گیت‌هاب کوپایلوت و مهندسی نرم‌افزار',
    url: 'https://github.blog/feed/',
    siteUrl: 'https://github.blog',
    category: 'برنامه‌نویسی و مهندسی نرم‌افزار',
    icon: 'git-branch',
    isPopular: true
  },
  {
    id: 'stackoverflow-blog',
    title: 'Stack Overflow Blog',
    description: 'فرهنگ برنامه‌نویسی، آمارهای سالانه توسعه‌دهندگان و معماری سیستم‌ها',
    url: 'https://stackoverflow.blog/feed/',
    siteUrl: 'https://stackoverflow.blog',
    category: 'برنامه‌نویسی و مهندسی نرم‌افزار',
    icon: 'help-circle',
    isPopular: true
  },
  {
    id: 'dev-to',
    title: 'DEV Community',
    description: 'مقالات تجربی، نکات کدنویسی و تبادل دانش میان جامعه بزرگ توسعه‌دهندگان',
    url: 'https://dev.to/feed',
    siteUrl: 'https://dev.to',
    category: 'برنامه‌نویسی و مهندسی نرم‌افزار',
    icon: 'code',
    isPopular: true
  },
  {
    id: 'infoq',
    title: 'InfoQ',
    description: 'معماری نرم‌افزار سازمانی، دواپس، میکروسرویس‌ها و روندهای تکنولوژی سازمانی',
    url: 'https://feed.infoq.com/',
    siteUrl: 'https://www.infoq.com',
    category: 'برنامه‌نویسی و مهندسی نرم‌افزار',
    icon: 'layers',
    isPopular: false
  },
  {
    id: 'freecodecamp',
    title: 'freeCodeCamp News',
    description: 'آموزش‌های رایگان و جامع برنامه‌نویسی وب، پایتون، الگوریتم‌ها و پروژه‌محور',
    url: 'https://www.freecodecamp.org/news/rss/',
    siteUrl: 'https://www.freecodecamp.org/news/',
    category: 'برنامه‌نویسی و مهندسی نرم‌افزار',
    icon: 'flame',
    isPopular: true
  },
  {
    id: 'martinfowler',
    title: 'Martin Fowler',
    description: 'مقاله‌های مرجع و تفکرات مارتین فاولر در باب ریفکتورینگ و معماری پاک',
    url: 'https://martinfowler.com/feed.atom',
    siteUrl: 'https://martinfowler.com',
    category: 'برنامه‌نویسی و مهندسی نرم‌افزار',
    icon: 'file-text',
    isPopular: true
  },
  {
    id: 'js-weekly',
    title: 'JavaScript Weekly',
    description: 'گزیده مهم‌ترین اخبار، کتابخانه‌ها و انتشارات هفتگی اکوسیستم جاوااسکریپت',
    url: 'https://cprss.s3.amazonaws.com/javascriptweekly.com.xml',
    siteUrl: 'https://javascriptweekly.com',
    category: 'برنامه‌نویسی و مهندسی نرم‌افزار',
    icon: 'code-2',
    isPopular: false
  },
  {
    id: 'nodejs-blog',
    title: 'Node.js Official Blog',
    description: 'نسخه‌های جدید نودجی‌اس، وصله‌های امنیتی و پایداری موتور V8',
    url: 'https://nodejs.org/en/feed/blog.xml',
    siteUrl: 'https://nodejs.org',
    category: 'برنامه‌نویسی و مهندسی نرم‌افزار',
    icon: 'server',
    isPopular: false
  },
  {
    id: 'go-blog',
    title: 'The Go Blog',
    description: 'اخبار رسمی توسعه زبان گو، مقالات فنی و تجربیات تیم توسعه گوگل',
    url: 'https://go.dev/blog/feed.atom',
    siteUrl: 'https://go.dev/blog/',
    category: 'برنامه‌نویسی و مهندسی نرم‌افزار',
    icon: 'terminal',
    isPopular: false
  },
  {
    id: 'rust-blog',
    title: 'Rust Programming Blog',
    description: 'به‌روزرسانی‌های فصلی کامپایلر زبان راست، ویژگی‌های زبان و اعلامیه‌های پروژه',
    url: 'https://blog.rust-lang.org/feed.xml',
    siteUrl: 'https://blog.rust-lang.org',
    category: 'برنامه‌نویسی و مهندسی نرم‌افزار',
    icon: 'shield',
    isPopular: false
  },
  {
    id: 'python-insider',
    title: 'Python Insider',
    description: 'اخبار مستقیم هسته مرکزی زبان برنامه‌نویسی پایتون و بنیاد نرم‌افزار پایتون',
    url: 'https://feeds.feedburner.com/PythonInsider',
    siteUrl: 'https://pythoninsider.blogspot.com',
    category: 'برنامه‌نویسی و مهندسی نرم‌افزار',
    icon: 'terminal',
    isPopular: false
  },
  {
    id: 'overreacted',
    title: 'Overreacted (Dan Abramov)',
    description: 'دیدگاه‌ها و مقالات فلسفی دن آبراموف در باب توسعه فرانت‌اند و ری‌اکت',
    url: 'https://overreacted.io/rss.xml',
    siteUrl: 'https://overreacted.io',
    category: 'برنامه‌نویسی و مهندسی نرم‌افزار',
    icon: 'sparkles',
    isPopular: true
  },
  {
    id: 'hanselman',
    title: 'Scott Hanselman',
    description: 'دیدگاه‌ها و یادداشت‌های اسکات هانسلمن درباره دنیای دات‌نت، وب و توسعه فردی',
    url: 'https://feeds.hanselman.com/ScottHanselman',
    siteUrl: 'https://www.hanselman.com/blog/',
    category: 'برنامه‌نویسی و مهندسی نرم‌افزار',
    icon: 'user',
    isPopular: false
  },
  {
    id: 'lobsters',
    title: 'Lobsters',
    description: 'جامعه گفتگوی متمرکز بر مباحث فنی، سیستم‌های عامل، کامپایلرها و امنیت',
    url: 'https://lobste.rs/rss',
    siteUrl: 'https://lobste.rs',
    category: 'برنامه‌نویسی و مهندسی نرم‌افزار',
    icon: 'terminal',
    isPopular: false
  },
  {
    id: 'dzone',
    title: 'DZone',
    description: 'راهنماهای فنی در زمینه کلود، دواپس، پایگاه‌داده و متدولوژی‌های چابک',
    url: 'https://feeds.dzone.com/home',
    siteUrl: 'https://dzone.com',
    category: 'برنامه‌نویسی و مهندسی نرم‌افزار',
    icon: 'database',
    isPopular: false
  },
  {
    id: 'hashnode',
    title: 'Hashnode Community',
    description: 'وبلاگ‌های مهندسی نرم‌افزار نوشته شده توسط برنامه‌نویسان سراسر دنیا',
    url: 'https://hashnode.com/rss',
    siteUrl: 'https://hashnode.com',
    category: 'برنامه‌نویسی و مهندسی نرم‌افزار',
    icon: 'edit',
    isPopular: false
  },
  {
    id: 'sokanacademy',
    title: 'سکان آکادمی',
    description: 'مقالات فارسی تخصصی آموزش برنامه‌نویسی، مصاحبه‌ها و سبک زندگی برنامه‌نویسان',
    url: 'https://sokanacademy.com/blog/rss',
    siteUrl: 'https://sokanacademy.com',
    category: 'برنامه‌نویسی و مهندسی نرم‌افزار',
    icon: 'book',
    isPopular: true
  },
  {
    id: 'jadi-net',
    title: 'کیبرد آزاد (جادی)',
    description: 'نوشته‌های جادی درباره لینوکس، متن‌باز، گنو، برنامه‌نویسی و پادکست رادیوگیک',
    url: 'https://jadi.net/feed/',
    siteUrl: 'https://jadi.net',
    category: 'برنامه‌نویسی و مهندسی نرم‌افزار',
    icon: 'coffee',
    isPopular: true
  },
  {
    id: 'netflix-techblog',
    title: 'Netflix TechBlog',
    description: 'نوآوری‌های نتفلیکس در معماری توزیع‌شده، میکروسرویس‌ها و مهندسی سیستم‌های مقیاس‌پذیر',
    url: 'https://netflixtechblog.com/feed',
    siteUrl: 'https://netflixtechblog.com',
    category: 'برنامه‌نویسی و مهندسی نرم‌افزار',
    icon: 'server',
    isPopular: true
  },
  {
    id: 'uber-eng',
    title: 'Uber Engineering',
    description: 'چالش‌های مقیاس‌پذیری میلیونی، طراحی سیستم و زیرساخت‌های مهندسی اوبر',
    url: 'https://www.uber.com/blog/engineering/rss/',
    siteUrl: 'https://www.uber.com/blog/engineering/',
    category: 'برنامه‌نویسی و مهندسی نرم‌افزار',
    icon: 'git-pull-request',
    isPopular: false
  },

  // ==========================================
  // ۴. سیاست و اخبار عمومی (World News & Politics) - 20 items
  // ==========================================
  {
    id: 'bbc-world',
    title: 'BBC News (World)',
    description: 'اخبار فوری بین‌المللی و گزارش‌های تحلیلی تحولات جهان',
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    siteUrl: 'https://www.bbc.com/news/world',
    category: 'سیاست و اخبار عمومی',
    icon: 'globe',
    isPopular: true
  },
  {
    id: 'reuters-top',
    title: 'Reuters World News',
    description: 'اخبار موثق، بی‌طرف و سریع از سراسر بازارهای بین‌المللی و ژئوپلیتیک',
    url: 'https://www.reutersagency.com/feed/?taxonomy=best-sectors&post_type=best',
    siteUrl: 'https://www.reuters.com',
    category: 'سیاست و اخبار عمومی',
    icon: 'newspaper',
    isPopular: false
  },
  {
    id: 'euronews-fa',
    title: 'یورونیوز فارسی',
    description: 'پوشش رویدادهای اتحادیه اروپا، خاورمیانه و جهان به زبان فارسی',
    url: 'https://fa.euronews.com/rss?format=mrss&level=theme&name=news',
    siteUrl: 'https://fa.euronews.com',
    category: 'سیاست و اخبار عمومی',
    icon: 'tv',
    isPopular: true
  },
  {
    id: 'bbc-persian',
    title: 'بی‌بی‌سی فارسی',
    description: 'آخرین اخبار ایران، خاورمیانه و جهان همراه با تحلیل‌های ویدیویی و متنی',
    url: 'https://feeds.bbci.co.uk/persian/rss.xml',
    siteUrl: 'https://www.bbc.com/persian',
    category: 'سیاست و اخبار عمومی',
    icon: 'radio',
    isPopular: true
  },
  {
    id: 'theguardian',
    title: 'The Guardian (World)',
    description: 'گزارش‌های مستقل بین‌المللی، روزنامه‌نگاری تحقیقی و ستون‌های تحلیلی گاردین',
    url: 'https://www.theguardian.com/world/rss',
    siteUrl: 'https://www.theguardian.com/world',
    category: 'سیاست و اخبار عمومی',
    icon: 'book-open',
    isPopular: true
  },
  {
    id: 'nytimes-world',
    title: 'New York Times (World)',
    description: 'پوشش عمیق اتفاقات بین‌المللی، گزارش‌های مستند و تحلیل‌های نیویورک تایمز',
    url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
    siteUrl: 'https://www.nytimes.com/section/world',
    category: 'سیاست و اخبار عمومی',
    icon: 'file-text',
    isPopular: true
  },
  {
    id: 'aljazeera-en',
    title: 'Al Jazeera English',
    description: 'پوشش تحولات جهان با تمرکز ویژه بر خاورمیانه، آسیا و آفریقا',
    url: 'https://www.aljazeera.com/xml/rss/all.xml',
    siteUrl: 'https://www.aljazeera.com',
    category: 'سیاست و اخبار عمومی',
    icon: 'globe',
    isPopular: false
  },
  {
    id: 'dw-persian',
    title: 'دویچه وله فارسی',
    description: 'اخبار معتبر آلمان، اروپا و تحولات اجتماعی سیاسی ایران',
    url: 'https://rss.dw.com/rdf/rss-per-all',
    siteUrl: 'https://www.dw.com/fa',
    category: 'سیاست و اخبار عمومی',
    icon: 'mic',
    isPopular: false
  },
  {
    id: 'isna',
    title: 'خبرگزاری ایسنا (ISNA)',
    description: 'اخبار فوری، رویدادهای دانشگاهی، علمی، فرهنگی و سیاسی ایران',
    url: 'https://www.isna.ir/rss',
    siteUrl: 'https://www.isna.ir',
    category: 'سیاست و اخبار عمومی',
    icon: 'newspaper',
    isPopular: true
  },
  {
    id: 'irna',
    title: 'خبرگزاری ایرنا (IRNA)',
    description: 'پوشش اخبار رسمی داخلی، دیپلماسی و رویدادهای سراسری ایران',
    url: 'https://www.irna.ir/rss',
    siteUrl: 'https://www.irna.ir',
    category: 'سیاست و اخبار عمومی',
    icon: 'newspaper',
    isPopular: false
  },
  {
    id: 'khabaronline',
    title: 'خبرآنلاین',
    description: 'تحلیل‌های روز، دیدگاه‌های صاحب‌نظران و اخبار داغ سیاسی و اجتماعی',
    url: 'https://www.khabaronline.ir/rss',
    siteUrl: 'https://www.khabaronline.ir',
    category: 'سیاست و اخبار عمومی',
    icon: 'zap',
    isPopular: true
  },
  {
    id: 'tabnak',
    title: 'تابناک',
    description: 'پایگاه خبری تحلیلی سیاسی، اجتماعی، اقتصادی و ورزشی',
    url: 'https://www.tabnak.ir/fa/rss/allnews',
    siteUrl: 'https://www.tabnak.ir',
    category: 'سیاست و اخبار عمومی',
    icon: 'activity',
    isPopular: false
  },
  {
    id: 'asriran',
    title: 'عصر ایران',
    description: 'مطالب تحلیلی روزانه، سواد زندگی، اخبار و مقالات فرهنگی و سیاسی',
    url: 'https://www.asriran.com/fa/rss/allnews',
    siteUrl: 'https://www.asriran.com',
    category: 'سیاست و اخبار عمومی',
    icon: 'file-text',
    isPopular: false
  },
  {
    id: 'fararu',
    title: 'فرارو',
    description: 'روایت رویدادها، نقد و بررسی‌های سیاسی و گزارش‌های روزنامه‌نگاری اجتماعی',
    url: 'https://fararu.com/fa/rss/allnews',
    siteUrl: 'https://fararu.com',
    category: 'سیاست و اخبار عمومی',
    icon: 'flag',
    isPopular: false
  },
  {
    id: 'time-world',
    title: 'TIME Magazine',
    description: 'گزارش‌های جلد معتبر، گفتگوها و مقالات تأثیرگذار مجله تایم',
    url: 'https://time.com/feed/',
    siteUrl: 'https://time.com',
    category: 'سیاست و اخبار عمومی',
    icon: 'clock',
    isPopular: false
  },
  {
    id: 'politico-us',
    title: 'Politico',
    description: 'گزارش‌های پشت پرده و جریان‌ساز از سیاست‌های کاخ سفید، کنگره و انتخابات',
    url: 'https://rss.politico.com/politics-news.xml',
    siteUrl: 'https://www.politico.com',
    category: 'سیاست و اخبار عمومی',
    icon: 'award',
    isPopular: false
  },
  {
    id: 'npr-news',
    title: 'NPR News',
    description: 'رادیو عمومی آمریکا؛ پوشش عمیق، انسانی و مستند از وقایع جهان',
    url: 'https://feeds.npr.org/1001/rss.xml',
    siteUrl: 'https://www.npr.org',
    category: 'سیاست و اخبار عمومی',
    icon: 'headphones',
    isPopular: false
  },
  {
    id: 'foreign-policy',
    title: 'Foreign Policy',
    description: 'نشریه معتبر سیاست خارجی، روابط بین‌الملل و بازی‌های ژئوپلیتیک قدرتها',
    url: 'https://foreignpolicy.com/feed/',
    siteUrl: 'https://foreignpolicy.com',
    category: 'سیاست و اخبار عمومی',
    icon: 'shield',
    isPopular: false
  },
  {
    id: 'ap-news',
    title: 'Associated Press News',
    description: 'اخبار فوری مستقیم از اتاق خبر اسوشیتد پرس بدون واسطه',
    url: 'https://feedx.net/rss/ap.xml',
    siteUrl: 'https://apnews.com',
    category: 'سیاست و اخبار عمومی',
    icon: 'rss',
    isPopular: false
  },
  {
    id: 'cnn-top',
    title: 'CNN Edition',
    description: 'پوشش چندرسانه‌ای آخرین اخبار بین‌المللی و حوادث مهم جهان',
    url: 'http://rss.cnn.com/rss/edition.rss',
    siteUrl: 'https://edition.cnn.com',
    category: 'سیاست و اخبار عمومی',
    icon: 'tv',
    isPopular: false
  },

  // ==========================================
  // ۵. اقتصاد و بازارهای مالی (Economy & Finance) - 20 items
  // ==========================================
  {
    id: 'donya-eqtesad',
    title: 'دنیای اقتصاد',
    description: 'تحلیل روزانه شاخص بورس، ارز، طلا، مسکن و سیاست‌های پولی و مالی ایران',
    url: 'https://donya-e-eqtesad.com/fa/rss/allnews',
    siteUrl: 'https://donya-e-eqtesad.com',
    category: 'اقتصاد و بازارهای مالی',
    icon: 'trending-up',
    isPopular: true
  },
  {
    id: 'tejaratnews',
    title: 'تجارت‌نیوز',
    description: 'پایش آنلاین بازارهای مالی، اقتصاد خرد و کلان، خودرو و سرمایه‌گذاری',
    url: 'https://tejaratnews.com/feed',
    siteUrl: 'https://tejaratnews.com',
    category: 'اقتصاد و بازارهای مالی',
    icon: 'dollar-sign',
    isPopular: true
  },
  {
    id: 'ecoiran',
    title: 'اکوایران',
    description: 'ویدیوها و گزارش‌های تحلیلی درباره اقتصاد سیاسی، داده‌ها و روند بازارهای مالی',
    url: 'https://ecoiran.com/fa/rss/allnews',
    siteUrl: 'https://ecoiran.com',
    category: 'اقتصاد و بازارهای مالی',
    icon: 'pie-chart',
    isPopular: true
  },
  {
    id: 'fardaeqtesad',
    title: 'فردای اقتصاد',
    description: 'رسانه تخصصی تحلیل روند اقتصاد ایران، صنایع پیشرو و تصمیمات کلان',
    url: 'https://www.fardayeeghtesad.com/rss',
    siteUrl: 'https://www.fardayeeghtesad.com',
    category: 'اقتصاد و بازارهای مالی',
    icon: 'bar-chart',
    isPopular: false
  },
  {
    id: 'nobitex-mag',
    title: 'نوبیتکس مگ',
    description: 'آموزش‌های کاربردی بلاکچین، تحلیل تکنیکال بیت‌کوین و روندهای کریپتوکارنسی',
    url: 'https://nobitex.ir/mag/feed/',
    siteUrl: 'https://nobitex.ir/mag',
    category: 'اقتصاد و بازارهای مالی',
    icon: 'bitcoin',
    isPopular: true
  },
  {
    id: 'arzdigital',
    title: 'ارزدیجیتال',
    description: 'تازه‌ترین قیمت رمزارزها، اخبار پروژه‌های وب ۳ و تحلیل‌های تکنیکال',
    url: 'https://arzdigital.com/feed/',
    siteUrl: 'https://arzdigital.com',
    category: 'اقتصاد و بازارهای مالی',
    icon: 'circle-dollar-sign',
    isPopular: true
  },
  {
    id: 'coindesk',
    title: 'CoinDesk',
    description: 'معتبرترین خبرگزاری بین‌المللی حوزه دارایی‌های دیجیتال و فناوری بلاک‌چین',
    url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
    siteUrl: 'https://www.coindesk.com',
    category: 'اقتصاد و بازارهای مالی',
    icon: 'coins',
    isPopular: true
  },
  {
    id: 'cointelegraph',
    title: 'CoinTelegraph',
    description: 'اخبار فوری ارزهای دیجیتال، فین‌تک، قراردادهای هوشمند و تحولات دیفای',
    url: 'https://cointelegraph.com/rss',
    siteUrl: 'https://cointelegraph.com',
    category: 'اقتصاد و بازارهای مالی',
    icon: 'link',
    isPopular: false
  },
  {
    id: 'bloomberg-tech',
    title: 'Bloomberg Markets',
    description: 'داده‌ها، تحلیل‌های وال‌استریت و روندهای شرکت‌های پیشرو اقتصادی جهان',
    url: 'https://feeds.bloomberg.com/technology/news.rss',
    siteUrl: 'https://www.bloomberg.com',
    category: 'اقتصاد و بازارهای مالی',
    icon: 'bar-chart-2',
    isPopular: true
  },
  {
    id: 'ft-home',
    title: 'Financial Times',
    description: 'بررسی بازارهای بین‌المللی، مدیریت مالی، اوراق قرضه و تجارت بین‌الملل',
    url: 'https://www.ft.com/rss/home',
    siteUrl: 'https://www.ft.com',
    category: 'اقتصاد و بازارهای مالی',
    icon: 'briefcase',
    isPopular: true
  },
  {
    id: 'forbes-biz',
    title: 'Forbes Business',
    description: 'روایت موفقیت کارآفرینان، استراتژی‌های رهبری و ثروتمندترین افراد دنیا',
    url: 'https://www.forbes.com/business/feed/',
    siteUrl: 'https://www.forbes.com',
    category: 'اقتصاد و بازارهای مالی',
    icon: 'award',
    isPopular: false
  },
  {
    id: 'wsj-markets',
    title: 'WSJ Markets',
    description: 'گزارش‌های موثق وال استریت ژورنال از بورس نیویورک، نفت و کالاهای اساسی',
    url: 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml',
    siteUrl: 'https://www.wsj.com',
    category: 'اقتصاد و بازارهای مالی',
    icon: 'trending-up',
    isPopular: false
  },
  {
    id: 'cnbc-top',
    title: 'CNBC Finance',
    description: 'پوشش همزمان گزارش درآمد شرکت‌ها، نرخ بهره فدرال رزرو و فرصت‌های معاملاتی',
    url: 'https://search.cnbc.com/rs/search/view.html?partnerId=2000&keywords=rss',
    siteUrl: 'https://www.cnbc.com',
    category: 'اقتصاد و بازارهای مالی',
    icon: 'activity',
    isPopular: false
  },
  {
    id: 'tahlilbazaar',
    title: 'تحلیل بازار',
    description: 'بررسی وضعیت بازار کالاهای اساسی، مسکن، خودرو و صادرات و واردات',
    url: 'https://www.tahlilbazaar.com/rss',
    siteUrl: 'https://www.tahlilbazaar.com',
    category: 'اقتصاد و بازارهای مالی',
    icon: 'layers',
    isPopular: false
  },
  {
    id: 'marketwatch',
    title: 'MarketWatch',
    description: 'اطلاعات در لحظه بازارها، قیمت سهام و راهنماهای کاربردی مدیریت سبد سهام',
    url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories',
    siteUrl: 'https://www.marketwatch.com',
    category: 'اقتصاد و بازارهای مالی',
    icon: 'eye',
    isPopular: false
  },
  {
    id: 'hbr-org',
    title: 'Harvard Business Review',
    description: 'بهترین مقالات استراتژی سازمانی، مدیریت، نوآوری و رهبری کسب‌وکار',
    url: 'https://feeds.hbr.org/harvardbusiness',
    siteUrl: 'https://hbr.org',
    category: 'اقتصاد و بازارهای مالی',
    icon: 'book',
    isPopular: true
  },
  {
    id: 'business-insider',
    title: 'Business Insider',
    description: 'داستان‌های جذاب تجاری، سرمایه‌گذاری و فرهنگ کاری شرکت‌های نوآور',
    url: 'https://feeds.feedburner.com/businessinsider',
    siteUrl: 'https://www.businessinsider.com',
    category: 'اقتصاد و بازارهای مالی',
    icon: 'briefcase',
    isPopular: false
  },
  {
    id: 'yahoo-finance',
    title: 'Yahoo Finance',
    description: 'نقل‌قول‌های سهام، ابزارهای تحلیل بنیادی و اخبار پرتفولیوهای مالی',
    url: 'https://finance.yahoo.com/news/rssindex',
    siteUrl: 'https://finance.yahoo.com',
    category: 'اقتصاد و بازارهای مالی',
    icon: 'dollar-sign',
    isPopular: false
  },
  {
    id: 'economist-fin',
    title: 'The Economist (Finance)',
    description: 'تحلیل‌های ساختاری و کلان مجله اکونومیست از نظم پولی و اقتصاد جهانی',
    url: 'https://www.economist.com/finance-and-economics/rss.xml',
    siteUrl: 'https://www.economist.com',
    category: 'اقتصاد و بازارهای مالی',
    icon: 'globe',
    isPopular: false
  },
  {
    id: 'investopedia',
    title: 'Investopedia',
    description: 'دیکشنری و آموزش‌های جامع اصطلاحات مالی، سرمایه‌گذاری و ارزیابی ریسک',
    url: 'https://www.investopedia.com/feedbuilder/feed/getFeed?feedName=rss_headline',
    siteUrl: 'https://www.investopedia.com',
    category: 'اقتصاد و بازارهای مالی',
    icon: 'help-circle',
    isPopular: false
  },

  // ==========================================
  // ۶. دانش و پژوهش (Science & Research) - 20 items
  // ==========================================
  {
    id: 'quanta',
    title: 'Quanta Magazine',
    description: 'روایت‌های عمیق از پیشرفت‌های بنیادین در ریاضیات، فیزیک نظری و کامپیوتر',
    url: 'https://api.quantamagazine.org/feed/',
    siteUrl: 'https://www.quantamagazine.org',
    category: 'دانش و پژوهش',
    icon: 'book-open',
    isPopular: true
  },
  {
    id: 'nature',
    title: 'Nature News',
    description: 'معتبرترین نشریه علمی جهان در حوزه کشفیات زیست‌شناسی، پزشکی و فیزیک',
    url: 'https://www.nature.com/nature.rss',
    siteUrl: 'https://www.nature.com',
    category: 'دانش و پژوهش',
    icon: 'flask-conical',
    isPopular: true
  },
  {
    id: 'science-mag',
    title: 'Science Magazine',
    description: 'پژوهش‌های همتاداوری شده برجسته و اخبار علمی بین‌المللی AAAS',
    url: 'https://www.science.org/rss/news_current.xml',
    siteUrl: 'https://www.science.org',
    category: 'دانش و پژوهش',
    icon: 'microscope',
    isPopular: true
  },
  {
    id: 'sciam',
    title: 'Scientific American',
    description: 'مقالات شفاف علمی به زبان عموم پیرامون ذهن، کیهان، سلامت و فناوری',
    url: 'http://rss.sciam.com/ScientificAmerican-Global',
    siteUrl: 'https://www.scientificamerican.com',
    category: 'دانش و پژوهش',
    icon: 'atom',
    isPopular: false
  },
  {
    id: 'newscientist',
    title: 'New Scientist',
    description: 'تازه‌ترین دستاوردهای علمی، نظریه‌های کیهان‌شناسی و پیشرفت‌های پزشکی',
    url: 'https://www.newscientist.com/feed/home/',
    siteUrl: 'https://www.newscientist.com',
    category: 'دانش و پژوهش',
    icon: 'sparkles',
    isPopular: false
  },
  {
    id: 'phys-org',
    title: 'Phys.org',
    description: 'پوشش روزانه مقالات فیزیک، نانوتکنولوژی، علم مواد و مکانیک کوانتومی',
    url: 'https://phys.org/rss-feed/',
    siteUrl: 'https://phys.org',
    category: 'دانش و پژوهش',
    icon: 'cpu',
    isPopular: false
  },
  {
    id: 'nasa-news',
    title: 'NASA Breaking News',
    description: 'تصاویر تلسکوپ جیمز وب، کاوشگرهای مریخ و ماموریت‌های فضایی ناسا',
    url: 'https://www.nasa.gov/news-release/feed/',
    siteUrl: 'https://www.nasa.gov',
    category: 'دانش و پژوهش',
    icon: 'rocket',
    isPopular: true
  },
  {
    id: 'space-com',
    title: 'Space.com',
    description: 'اخبار پرتاب موشک‌ها، رویدادهای رصدی آسمان شب و اکتشافات منظومه شمسی',
    url: 'https://www.space.com/feeds/all',
    siteUrl: 'https://www.space.com',
    category: 'دانش و پژوهش',
    icon: 'telescope',
    isPopular: true
  },
  {
    id: 'sciencedaily',
    title: 'ScienceDaily',
    description: 'خلاصه‌های جامع آخرین تحقیقات دانشگاه‌های جهان در تمام شاخه‌های علمی',
    url: 'https://www.sciencedaily.com/rss/all.xml',
    siteUrl: 'https://www.sciencedaily.com',
    category: 'دانش و پژوهش',
    icon: 'globe',
    isPopular: false
  },
  {
    id: 'livescience',
    title: 'Live Science',
    description: 'پاسخ به سوالات علمی، شگفتی‌های تاریخ طبیعی، باستان‌شناسی و سلامت انسان',
    url: 'https://www.livescience.com/feeds/all',
    siteUrl: 'https://www.livescience.com',
    category: 'دانش و پژوهش',
    icon: 'compass',
    isPopular: false
  },
  {
    id: 'digikala-mag-sci',
    title: 'دیجی‌کالا مگ (علمی)',
    description: 'مقالات جذاب به زبان ساده پیرامون نجوم، زیست‌شناسی و تاریخ علم',
    url: 'https://www.digikala.com/mag/science-technology/feed/',
    siteUrl: 'https://www.digikala.com/mag/science-technology/',
    category: 'دانش و پژوهش',
    icon: 'laptop',
    isPopular: true
  },
  {
    id: 'bigbangpage',
    title: 'بیگ بنگ (کیهان‌شناسی)',
    description: 'مقالات تخصصی فیزیک کوانتوم، نسبیت عام و شگفتی‌های کیهان به زبان فارسی',
    url: 'https://bigbangpage.com/feed/',
    siteUrl: 'https://bigbangpage.com',
    category: 'دانش و پژوهش',
    icon: 'moon',
    isPopular: true
  },
  {
    id: 'natgeo-news',
    title: 'National Geographic',
    description: 'مستندنگاری شگفتی‌های حیات وحش، محیط زیست، فرهنگ‌ها و اقلیم‌شناسی',
    url: 'https://feeds.nationalgeographic.com/ng/News/News_Main',
    siteUrl: 'https://www.nationalgeographic.com',
    category: 'دانش و پژوهش',
    icon: 'camera',
    isPopular: true
  },
  {
    id: 'popmech',
    title: 'Popular Mechanics',
    description: 'نوآوری‌های مهندسی هوافضا، تجهیزات نظامی، مکانیک و اختراعات شگفت‌انگیز',
    url: 'https://www.popularmechanics.com/rss/all.xml/',
    siteUrl: 'https://www.popularmechanics.com',
    category: 'دانش و پژوهش',
    icon: 'tool',
    isPopular: false
  },
  {
    id: 'smithsonian',
    title: 'Smithsonian Magazine',
    description: 'گزارش‌های پژوهشی موزه اسمیتسونین در حوزه تاریخ، هنر و دانش تجربی',
    url: 'https://www.smithsonianmag.com/rss/latest_articles/',
    siteUrl: 'https://www.smithsonianmag.com',
    category: 'دانش و پژوهش',
    icon: 'feather',
    isPopular: false
  },
  {
    id: 'nautilus',
    title: 'Nautilus',
    description: 'پیوند فلسفه، علوم شناختی و فیزیک با روایت‌گری ادبی و تصویرسازی مدرن',
    url: 'https://nautil.us/feed/',
    siteUrl: 'https://nautil.us',
    category: 'دانش و پژوهش',
    icon: 'anchor',
    isPopular: false
  },
  {
    id: 'ars-science',
    title: 'Ars Technica Science',
    description: 'تحلیل‌های علمی بدون اغراق و گزارش‌های دقیق از ژنتیک، آب‌وهوا و فیزیک',
    url: 'https://feeds.arstechnica.com/arstechnica/science',
    siteUrl: 'https://arstechnica.com/science/',
    category: 'دانش و پژوهش',
    icon: 'flask-round',
    isPopular: false
  },
  {
    id: 'astronomy-mag',
    title: 'Astronomy Magazine',
    description: 'راهنماهای رصد سیارات، رویدادهای نجومی و کشف سیاه‌چاله‌ها و کهکشان‌ها',
    url: 'https://www.astronomy.com/feed/',
    siteUrl: 'https://www.astronomy.com',
    category: 'دانش و پژوهش',
    icon: 'sun',
    isPopular: false
  },
  {
    id: 'mit-news',
    title: 'MIT News',
    description: 'تحقیقات پیشگامانه پژوهشگران و اساتید دانشگاه ام‌آی‌تی در مرزهای دانش',
    url: 'https://news.mit.edu/rss/feed',
    siteUrl: 'https://news.mit.edu',
    category: 'دانش و پژوهش',
    icon: 'award',
    isPopular: false
  },
  {
    id: 'universe-today',
    title: 'Universe Today',
    description: 'اخبار هفتگی فضا، پرتاب‌های راکتی اسپیس‌ایکس و اکتشافات سیارات فراخورشیدی',
    url: 'https://www.universetoday.com/feed/',
    siteUrl: 'https://www.universetoday.com',
    category: 'دانش و پژوهش',
    icon: 'satellite',
    isPopular: false
  },

  // ==========================================
  // ۷. طراحی و تجربه کاربری (Design & UX) - 20 items
  // ==========================================
  {
    id: 'smashing-mag',
    title: 'Smashing Magazine',
    description: 'راهنماهای تخصصی برای طراحان تجربه کاربری، فرانت‌اند و تایپوگرافی',
    url: 'https://www.smashingmagazine.com/feed/',
    siteUrl: 'https://www.smashingmagazine.com',
    category: 'طراحی و تجربه کاربری',
    icon: 'palette',
    isPopular: true
  },
  {
    id: 'css-tricks',
    title: 'CSS-Tricks',
    description: 'تکنیک‌های مدرن وب، طراحی واکنش‌گرا و استایل‌نویسی حرفه‌ای',
    url: 'https://css-tricks.com/feed/',
    siteUrl: 'https://css-tricks.com',
    category: 'طراحی و تجربه کاربری',
    icon: 'layout',
    isPopular: false
  },
  {
    id: 'alistapart',
    title: 'A List Apart',
    description: 'مقاله‌های کلاسیک و بنیادین وب‌دیزاین، استانداردهای وب و معماری اطلاعات',
    url: 'https://alistapart.com/main/feed/',
    siteUrl: 'https://alistapart.com',
    category: 'طراحی و تجربه کاربری',
    icon: 'book',
    isPopular: true
  },
  {
    id: 'uxcollective',
    title: 'UX Collective',
    description: 'انتشارات معتبر در مدیوم پیرامون تفکر طراحی، پروداکت دیزاین و سیستم‌های دیزاین',
    url: 'https://uxdesign.cc/feed',
    siteUrl: 'https://uxdesign.cc',
    category: 'طراحی و تجربه کاربری',
    icon: 'pen-tool',
    isPopular: true
  },
  {
    id: 'uxmag',
    title: 'UX Magazine',
    description: 'استراتژی‌های طراحی تجربه کاربری، پژوهش کاربر و روندهای دیزاین تعاملی',
    url: 'https://uxmag.com/feed',
    siteUrl: 'https://uxmag.com',
    category: 'طراحی و تجربه کاربری',
    icon: 'feather',
    isPopular: false
  },
  {
    id: 'nngroup',
    title: 'Nielsen Norman Group',
    description: 'معتبرترین مرجع جهانی در زمینه اصول کاربردپذیری (Usability) و تست‌های کاربری',
    url: 'https://www.nngroup.com/feed/rss/',
    siteUrl: 'https://www.nngroup.com',
    category: 'طراحی و تجربه کاربری',
    icon: 'check-square',
    isPopular: true
  },
  {
    id: 'muzli',
    title: 'Muzli Design Inspiration',
    description: 'الهام‌بخش‌ترین پروژه‌های بصری، طراحی رابط کاربری و انیمیشن‌های تعاملی',
    url: 'https://medium.muz.li/feed',
    siteUrl: 'https://muz.li',
    category: 'طراحی و تجربه کاربری',
    icon: 'sparkles',
    isPopular: true
  },
  {
    id: 'sidebar-io',
    title: 'Sidebar.io',
    description: 'روزانه ۵ لینک برتر از گزیده ناب‌ترین مقالات و منابع طراحی وب در دنیا',
    url: 'https://sidebar.io/feed.xml',
    siteUrl: 'https://sidebar.io',
    category: 'طراحی و تجربه کاربری',
    icon: 'sidebar',
    isPopular: false
  },
  {
    id: 'webdesignerdepot',
    title: 'Webdesigner Depot',
    description: 'روندهای تایپوگرافی، پالت‌های رنگی و بهترین نمونه‌های طراحی وب جهان',
    url: 'https://www.webdesignerdepot.com/feed/',
    siteUrl: 'https://www.webdesignerdepot.com',
    category: 'طراحی و تجربه کاربری',
    icon: 'monitor',
    isPopular: false
  },
  {
    id: 'fastco-design',
    title: 'Fast Company (Design)',
    description: 'طراحی صنعتی، برندینگ مدرن و نقش طراحی خلاقانه در رهبری بازارها',
    url: 'https://www.fastcompany.com/co-design/rss',
    siteUrl: 'https://www.fastcompany.com',
    category: 'طراحی و تجربه کاربری',
    icon: 'award',
    isPopular: false
  },
  {
    id: 'creativebloq',
    title: 'Creative Bloq',
    description: 'الهام‌بخش هنرمندان دیجیتال، ابزارهای گرافیکی و طراحی سه‌بعدی وکتور',
    url: 'https://www.creativebloq.com/feed',
    siteUrl: 'https://www.creativebloq.com',
    category: 'طراحی و تجربه کاربری',
    icon: 'image',
    isPopular: false
  },
  {
    id: 'codrops',
    title: 'Codrops',
    description: 'انیمیشن‌های خلاقانه وب، افکت‌های مدرن UI و تکنیک‌های تعاملی فرانت‌اند',
    url: 'https://tympanus.net/codrops/feed/',
    siteUrl: 'https://tympanus.net/codrops/',
    category: 'طراحی و تجربه کاربری',
    icon: 'code',
    isPopular: false
  },
  {
    id: 'brand-new',
    title: 'Brand New',
    description: 'نقد و بررسی تخصصی ری‌برندینگ‌ها و لوگوهای جدید کمپانی‌های بزرگ جهان',
    url: 'https://www.underconsideration.com/brandnew/feed/',
    siteUrl: 'https://www.underconsideration.com/brandnew/',
    category: 'طراحی و تجربه کاربری',
    icon: 'tag',
    isPopular: false
  },
  {
    id: 'abduzeedo',
    title: 'Abduzeedo',
    description: 'مجموعه‌ای الهام‌بخش از معماری، گرافیک دیزاین، تصویرسازی و سبک‌های هنری',
    url: 'https://abduzeedo.com/feed',
    siteUrl: 'https://abduzeedo.com',
    category: 'طراحی و تجربه کاربری',
    icon: 'layers',
    isPopular: false
  },
  {
    id: 'typewolf',
    title: 'Typewolf',
    description: 'بررسی فونت‌های جذاب وب، جفت‌سازی تایپ‌فیس‌ها و تایپوگرافی دیجیتال',
    url: 'https://www.typewolf.com/feed',
    siteUrl: 'https://www.typewolf.com',
    category: 'طراحی و تجربه کاربری',
    icon: 'type',
    isPopular: false
  },
  {
    id: 'designernews',
    title: 'Designer News',
    description: 'جامعه تبادل نظر طراحان محصول درباره ابزارهای جدید و بازخورد طرح‌ها',
    url: 'https://www.designernews.co/?format=rss',
    siteUrl: 'https://www.designernews.co',
    category: 'طراحی و تجربه کاربری',
    icon: 'newspaper',
    isPopular: false
  },
  {
    id: 'uxplanet',
    title: 'UX Planet',
    description: 'راهنماهای آغاز به کار در حوزه طراحی UI/UX و ترفندهای طراحی اپلیکیشن‌های موبایل',
    url: 'https://uxplanet.org/feed',
    siteUrl: 'https://uxplanet.org',
    category: 'طراحی و تجربه کاربری',
    icon: 'globe',
    isPopular: false
  },
  {
    id: 'figma-blog',
    title: 'Figma Blog',
    description: 'اخبار رسمی ویژگی‌های فیگما، دیزاین سیستم‌ها و فرهنگ طراحی مشارکتی',
    url: 'https://www.figma.com/blog/feed/atom.xml',
    siteUrl: 'https://www.figma.com/blog',
    category: 'طراحی و تجربه کاربری',
    icon: 'figma',
    isPopular: true
  },
  {
    id: 'dezeen',
    title: 'Dezeen Design',
    description: 'پرخواننده‌ترین مجله معماری مدرن، دکوراسیون و طراحی صنعتی جهان',
    url: 'https://www.dezeen.com/feed/',
    siteUrl: 'https://www.dezeen.com',
    category: 'طراحی و تجربه کاربری',
    icon: 'home',
    isPopular: false
  },
  {
    id: 'designmilk',
    title: 'Design Milk',
    description: 'کشف جدیدترین ایده‌ها در هنر، طراحی مبلمان، فشن و نوآوری‌های مدرن',
    url: 'https://design-milk.com/feed/',
    siteUrl: 'https://design-milk.com',
    category: 'طراحی و تجربه کاربری',
    icon: 'coffee',
    isPopular: false
  },

  // ==========================================
  // ۸. امنیت سایبری و شبکه (Cybersecurity & Networking) - 20 items
  // ==========================================
  {
    id: 'krebsonsecurity',
    title: 'Krebs on Security',
    description: 'افشاگری‌های تخصصی برایان کربس درباره جرائم سایبری، باج‌افزارها و نشت داده',
    url: 'https://krebsonsecurity.com/feed/',
    siteUrl: 'https://krebsonsecurity.com',
    category: 'امنیت سایبری و شبکه',
    icon: 'shield-alert',
    isPopular: true
  },
  {
    id: 'thehackernews',
    title: 'The Hacker News (THN)',
    description: 'اخبار فوری آسیب‌پذیری‌ها، اکسپلویت‌های روزصفر و حملات بدافزاری جهانی',
    url: 'https://feeds.feedburner.com/TheHackersNews',
    siteUrl: 'https://thehackernews.com',
    category: 'امنیت سایبری و شبکه',
    icon: 'lock',
    isPopular: true
  },
  {
    id: 'bleepingcomputer',
    title: 'BleepingComputer',
    description: 'منبع نخست اخبار ضدباج‌افزار، وصله‌های امنیتی سیستم‌عامل‌ها و سرقت داده',
    url: 'https://www.bleepingcomputer.com/feed/',
    siteUrl: 'https://www.bleepingcomputer.com',
    category: 'امنیت سایبری و شبکه',
    icon: 'alert-triangle',
    isPopular: true
  },
  {
    id: 'darkreading',
    title: 'Dark Reading',
    description: 'تحلیل‌های امنیتی برای مدیران امنیت شبکه، تهدیدات سازمانی و پاسخ به حوادث',
    url: 'https://www.darkreading.com/rss.xml',
    siteUrl: 'https://www.darkreading.com',
    category: 'امنیت سایبری و شبکه',
    icon: 'eye-off',
    isPopular: false
  },
  {
    id: 'threatpost',
    title: 'Threatpost',
    description: 'اخبار مستقل امنیت اطلاعات، تست نفوذ و بررسی ساختار بدافزارهای نوین',
    url: 'https://threatpost.com/feed/',
    siteUrl: 'https://threatpost.com',
    category: 'امنیت سایبری و شبکه',
    icon: 'shield',
    isPopular: false
  },
  {
    id: 'schneier',
    title: 'Schneier on Security',
    description: 'یادداشت‌های بروس اشنایر در باب رمزنگاری، حریم خصوصی و امنیت ملی',
    url: 'https://www.schneier.com/feed/atom/',
    siteUrl: 'https://www.schneier.com',
    category: 'امنیت سایبری و شبکه',
    icon: 'key',
    isPopular: true
  },
  {
    id: 'sans-isc',
    title: 'SANS Internet Storm Center',
    description: 'پایش مستمر ترافیک مخرب اینترنت، اسکن پورت‌ها و تحلیل تهدیدات آنی شبکه',
    url: 'https://isc.sans.edu/rssfeed.xml',
    siteUrl: 'https://isc.sans.edu',
    category: 'امنیت سایبری و شبکه',
    icon: 'zap',
    isPopular: false
  },
  {
    id: 'securityweek',
    title: 'SecurityWeek',
    description: 'اطلاعات استراتژیک امنیت فناوری، سرمایه‌گذاری‌های سکوریتی و رخنه‌های امنیتی',
    url: 'https://feeds.feedburner.com/securityweek',
    siteUrl: 'https://www.securityweek.com',
    category: 'امنیت سایبری و شبکه',
    icon: 'file-text',
    isPopular: false
  },
  {
    id: 'malwarebytes-labs',
    title: 'Malwarebytes Labs',
    description: 'کالبدشکافی فنی کدهای مخرب، مهندسی اجتماعی و راهکارهای محافظت کاربر نهایی',
    url: 'https://www.malwarebytes.com/blog/feed/index.xml',
    siteUrl: 'https://www.malwarebytes.com/blog',
    category: 'امنیت سایبری و شبکه',
    icon: 'bug',
    isPopular: false
  },
  {
    id: 'trendmicro-blog',
    title: 'Trend Micro Security',
    description: 'پژوهش‌های میدانی پیرامون امنیت زیرساخت ابری، اینترنت اشیاء و تهدیدات پیشرفته',
    url: 'https://feeds.feedburner.com/Anti-MalwareBlog',
    siteUrl: 'https://www.trendmicro.com',
    category: 'امنیت سایبری و شبکه',
    icon: 'shield-check',
    isPopular: false
  },
  {
    id: 'sophos-naked',
    title: 'Sophos Naked Security',
    description: 'اخبار و هشدارهای امنیتی ملموس برای پیشگیری از کلاهبرداری‌های اینترنتی',
    url: 'https://nakedsecurity.sophos.com/feed/',
    siteUrl: 'https://nakedsecurity.sophos.com',
    category: 'امنیت سایبری و شبکه',
    icon: 'shield-off',
    isPopular: false
  },
  {
    id: 'project-zero',
    title: 'Google Project Zero',
    description: 'کشف عمیق آسیب‌پذیری‌های روزصفر ناشناخته توسط نخبگان تیم امنیتی گوگل',
    url: 'https://googleprojectzero.blogspot.com/feeds/posts/default',
    siteUrl: 'https://googleprojectzero.blogspot.com',
    category: 'امنیت سایبری و شبکه',
    icon: 'target',
    isPopular: true
  },
  {
    id: 'cloudflare-blog',
    title: 'Cloudflare Blog',
    description: 'گزارش‌های مهار حملات DDoS، معماری لبه، امنیت DNS و سرعت زیرساخت شبکه',
    url: 'https://blog.cloudflare.com/rss/',
    siteUrl: 'https://blog.cloudflare.com',
    category: 'امنیت سایبری و شبکه',
    icon: 'cloud-lightning',
    isPopular: true
  },
  {
    id: 'ictna',
    title: 'ایستنا (ارتباطات و امنیت)',
    description: 'اخبار اپراتورها، شبکه ملی، فیلترینگ و تحولات زیرساخت ارتباطی ایران',
    url: 'https://www.ictna.ir/feed/',
    siteUrl: 'https://www.ictna.ir',
    category: 'امنیت سایبری و شبکه',
    icon: 'wifi',
    isPopular: false
  },
  {
    id: 'aftana',
    title: 'افتانا (امنیت فضای تولید و تبادل)',
    description: 'پایگاه خبری تخصصی امنیت سایبری، باج‌افزارها و رخدادهای شبکه در ایران',
    url: 'https://www.aftana.ir/fa/rss/allnews',
    siteUrl: 'https://www.aftana.ir',
    category: 'امنیت سایبری و شبکه',
    icon: 'shield',
    isPopular: true
  },
  {
    id: 'apa-sharif',
    title: 'مرکز آپا شریف',
    description: 'هشدارهای امنیتی، امداد و هماهنگی عملیات رخدادهای رایانه‌ای دانشگاه شریف',
    url: 'https://cert.sharif.edu/feed/',
    siteUrl: 'https://cert.sharif.edu',
    category: 'امنیت سایبری و شبکه',
    icon: 'award',
    isPopular: false
  },
  {
    id: 'unit42-paloalto',
    title: 'Palo Alto Unit 42',
    description: 'گزارش‌های اطلاعات تهدید سایبری (Threat Intelligence) و تحلیل رفتاری هکرها',
    url: 'https://unit42.paloaltonetworks.com/feed/',
    siteUrl: 'https://unit42.paloaltonetworks.com',
    category: 'امنیت سایبری و شبکه',
    icon: 'radar',
    isPopular: false
  },
  {
    id: 'cisa-alerts',
    title: 'CISA Security Advisories',
    description: 'اعلامیه‌های رسمی سازمان امنیت سایبری و زیرساخت آمریکا در مورد باگ‌های بحرانی',
    url: 'https://www.cisa.gov/cybersecurity-advisories/all.xml',
    siteUrl: 'https://www.cisa.gov',
    category: 'امنیت سایبری و شبکه',
    icon: 'bell',
    isPopular: false
  },
  {
    id: 'welivesecurity',
    title: 'WeLiveSecurity (ESET)',
    description: 'تحقیقات آزمایشگاه کسپرسکی و ای‌ست پیرامون خانواده‌های جدید جاسوس‌افزارها',
    url: 'https://www.welivesecurity.com/feed/',
    siteUrl: 'https://www.welivesecurity.com',
    category: 'امنیت سایبری و شبکه',
    icon: 'check-circle',
    isPopular: false
  },
  {
    id: 'portswigger',
    title: 'PortSwigger Daily Swig',
    description: 'اخبار تست نفوذ وب، ابزار Burp Suite و حملات تزریق کد و آسیب‌پذیری‌های وب',
    url: 'https://portswigger.net/daily-swig/rss',
    siteUrl: 'https://portswigger.net',
    category: 'امنیت سایبری و شبکه',
    icon: 'unlock',
    isPopular: false
  },

  // ==========================================
  // ۹. بازی و سرگرمی دیجیتال (Gaming & Entertainment) - 20 items
  // ==========================================
  {
    id: 'ign',
    title: 'IGN',
    description: 'نقدها، پیش‌نمایش‌ها، تریلرها و نمرات بازی‌های ویدیویی، سینما و تلویزیون',
    url: 'https://feeds.feedburner.com/ign/all',
    siteUrl: 'https://www.ign.com',
    category: 'بازی و سرگرمی دیجیتال',
    icon: 'gamepad-2',
    isPopular: true
  },
  {
    id: 'gamespot',
    title: 'GameSpot',
    description: 'بررسی موشکافانه بازی‌های پلی‌استیشن، ایکس‌باکس، پی‌سی و نینتندو',
    url: 'https://www.gamespot.com/feeds/mashup/',
    siteUrl: 'https://www.gamespot.com',
    category: 'بازی و سرگرمی دیجیتال',
    icon: 'play-circle',
    isPopular: true
  },
  {
    id: 'kotaku',
    title: 'Kotaku',
    description: 'فرهنگ گیمینگ، راهنماهای بازی، شایعات استودیوهای بازی‌سازی و طنز بازی',
    url: 'https://kotaku.com/rss',
    siteUrl: 'https://kotaku.com',
    category: 'بازی و سرگرمی دیجیتال',
    icon: 'sword',
    isPopular: true
  },
  {
    id: 'polygon',
    title: 'Polygon',
    description: 'دیدگاه‌های هنری در نقد بازی‌ها، معرفی کتاب‌های کمیک و دنیای انیمه',
    url: 'https://www.polygon.com/rss/index.xml',
    siteUrl: 'https://www.polygon.com',
    category: 'بازی و سرگرمی دیجیتال',
    icon: 'box',
    isPopular: true
  },
  {
    id: 'pcgamer',
    title: 'PC Gamer',
    description: 'اخبار اختصاصی بازی‌های کامپیوتر شخصی، مادها، تنظیمات گرافیکی و استیم',
    url: 'https://www.pcgamer.com/rss',
    siteUrl: 'https://www.pcgamer.com',
    category: 'بازی و سرگرمی دیجیتال',
    icon: 'monitor',
    isPopular: false
  },
  {
    id: 'eurogamer',
    title: 'Eurogamer',
    description: 'ژورنالیسم مستقل صنعت گیم در اروپا همراه با تحلیل‌های فنی دیجیتال فاندری',
    url: 'https://www.eurogamer.net/feed',
    siteUrl: 'https://www.eurogamer.net',
    category: 'بازی و سرگرمی دیجیتال',
    icon: 'compass',
    isPopular: false
  },
  {
    id: 'vigiato',
    title: 'ویجیاتو (Vigiato)',
    description: 'جامع‌ترین رسانه فارسی نقد و بررسی بازی‌های ویدیویی، سینما، سریال و بردگیم',
    url: 'https://vigiato.net/feed',
    siteUrl: 'https://vigiato.net',
    category: 'بازی و سرگرمی دیجیتال',
    icon: 'tv',
    isPopular: true
  },
  {
    id: 'zoomg',
    title: 'زومجی (Zoomg)',
    description: 'اخبار بازی‌های پلی‌استیشن، پی‌سی، فیلم و باکس آفیس با دوبله و زیرنویس',
    url: 'https://www.zoomg.ir/feed/',
    siteUrl: 'https://www.zoomg.ir',
    category: 'بازی و سرگرمی دیجیتال',
    icon: 'film',
    isPopular: true
  },
  {
    id: 'gamefa',
    title: 'گیم‌فا (Gamefa)',
    description: 'نخستین مرجع اخبار لحظه‌ای بازی‌ها، مقالات تحلیلی و تریلرهای صنعت گیم در ایران',
    url: 'https://gamefa.com/feed/',
    siteUrl: 'https://gamefa.com',
    category: 'بازی و سرگرمی دیجیتال',
    icon: 'crosshair',
    isPopular: true
  },
  {
    id: 'rps',
    title: 'Rock Paper Shotgun',
    description: 'تمرکز ویژه بر بازی‌های مستقل (Indie)، استراتژیک و بازی‌های خلاقانه پی‌سی',
    url: 'https://www.rockpapershotgun.com/feed',
    siteUrl: 'https://www.rockpapershotgun.com',
    category: 'بازی و سرگرمی دیجیتال',
    icon: 'scissors',
    isPopular: false
  },
  {
    id: 'destructoid',
    title: 'Destructoid',
    description: 'مطالب پرانرژی جامعه گیمرها، پادکست‌های بازی و راهنمای مراحل عناوین جدید',
    url: 'https://www.destructoid.com/feed/',
    siteUrl: 'https://www.destructoid.com',
    category: 'بازی و سرگرمی دیجیتال',
    icon: 'bomb',
    isPopular: false
  },
  {
    id: 'gematsu',
    title: 'Gematsu',
    description: 'پوشش تخصصی بازی‌های ژاپنی (JRPG)، تاریخ انتشار کنسول‌ها و بیانیه‌های استودیوها',
    url: 'https://www.gematsu.com/feed',
    siteUrl: 'https://www.gematsu.com',
    category: 'بازی و سرگرمی دیجیتال',
    icon: 'sparkle',
    isPopular: false
  },
  {
    id: 'pocketgamer',
    title: 'Pocket Gamer',
    description: 'نقد و بررسی بهترین بازی‌های موبایل برای پلتفرم‌های iOS و اندروید',
    url: 'https://www.pocketgamer.com/rss/',
    siteUrl: 'https://www.pocketgamer.com',
    category: 'بازی و سرگرمی دیجیتال',
    icon: 'smartphone',
    isPopular: false
  },
  {
    id: 'nintendolife',
    title: 'Nintendo Life',
    description: 'همه چیز درباره کنسول نینتندو سوییچ، فرانچایزهای زلدا، ماریو و پوکمون',
    url: 'https://www.nintendolife.com/feeds/latest',
    siteUrl: 'https://www.nintendolife.com',
    category: 'بازی و سرگرمی دیجیتال',
    icon: 'heart',
    isPopular: false
  },
  {
    id: 'pushsquare',
    title: 'Push Square (PlayStation)',
    description: 'اخبار رسمی پلی‌استیشن ۵، اشتراک پلی‌استیشن پلاس و بازی‌های اختصاصی سونی',
    url: 'https://www.pushsquare.com/feeds/latest',
    siteUrl: 'https://www.pushsquare.com',
    category: 'بازی و سرگرمی دیجیتال',
    icon: 'square',
    isPopular: false
  },
  {
    id: 'purexbox',
    title: 'Pure Xbox',
    description: 'اطلاعیه‌های گیم‌پس مایکروسافت، عناوین استودیوهای ایکس‌باکس و تخفیف‌ها',
    url: 'https://www.purexbox.com/feeds/latest',
    siteUrl: 'https://www.purexbox.com',
    category: 'بازی و سرگرمی دیجیتال',
    icon: 'circle',
    isPopular: false
  },
  {
    id: 'screenrant',
    title: 'Screen Rant (سینما و سریال)',
    description: 'نقد فیلم‌های هالیوود، ایستراگ‌های دنیای مارول و دی‌سی و اخبار سریال‌های پرطرفدار',
    url: 'https://screenrant.com/feed/',
    siteUrl: 'https://screenrant.com',
    category: 'بازی و سرگرمی دیجیتال',
    icon: 'video',
    isPopular: false
  },
  {
    id: 'collider',
    title: 'Collider',
    description: 'مصاحبه با کارگردانان، تریلرهای اختصاصی سینمایی و پشت‌صحنه فیلم‌ها',
    url: 'https://collider.com/feed/',
    siteUrl: 'https://collider.com',
    category: 'بازی و سرگرمی دیجیتال',
    icon: 'clapperboard',
    isPopular: false
  },
  {
    id: 'sargarme',
    title: 'سرگرمی (Sargarme)',
    description: 'مجله دیجیتال سینما، انیمیشن و فرهنگ هواداری کمیک بوک به زبان فارسی',
    url: 'https://sargarme.com/feed/',
    siteUrl: 'https://sargarme.com',
    category: 'بازی و سرگرمی دیجیتال',
    icon: 'smile',
    isPopular: false
  },
  {
    id: 'dualshockers',
    title: 'DualShockers',
    description: 'تحلیل داستان بازی‌ها، ایستراگ‌ها و گفتگو با طراحان گیم در استودیوهای برتر',
    url: 'https://www.dualshockers.com/feed/',
    siteUrl: 'https://www.dualshockers.com',
    category: 'بازی و سرگرمی دیجیتال',
    icon: 'activity',
    isPopular: false
  },

  // ==========================================
  // ۱۰. سبک زندگی، فرهنگ و یادگیری (Lifestyle, Culture & Learning) - 20 items
  // ==========================================
  {
    id: 'lifehacker',
    title: 'Lifehacker',
    description: 'ترفندهای بهره‌وری، سازماندهی شخصی، مدیریت زمان و تکنیک‌های زندگی روزمره',
    url: 'https://lifehacker.com/rss',
    siteUrl: 'https://lifehacker.com',
    category: 'سبک زندگی، فرهنگ و یادگیری',
    icon: 'check-circle-2',
    isPopular: true
  },
  {
    id: 'zenhabits',
    title: 'Zen Habits',
    description: 'نوشته‌های الهام‌بخش لئو بابائوتا در باب مینیمالیسم، آرامش ذهن و سادگی',
    url: 'https://zenhabits.net/feed/',
    siteUrl: 'https://zenhabits.net',
    category: 'سبک زندگی، فرهنگ و یادگیری',
    icon: 'sun',
    isPopular: true
  },
  {
    id: 'fs-blog',
    title: 'Farnam Street (FS)',
    description: 'مدل‌های ذهنی، مهارت تصمیم‌گیری عقلانی و هنر تفکر شفاف',
    url: 'https://fs.blog/feed/',
    siteUrl: 'https://fs.blog',
    category: 'سبک زندگی، فرهنگ و یادگیری',
    icon: 'brain',
    isPopular: true
  },
  {
    id: 'marginalian',
    title: 'The Marginalian',
    description: 'تأملات ادبی و فلسفی ماریا پوپوا پیرامون معنای زندگی، هنر، شعر و علم',
    url: 'https://www.themarginalian.org/feed/',
    siteUrl: 'https://www.themarginalian.org',
    category: 'سبک زندگی، فرهنگ و یادگیری',
    icon: 'feather',
    isPopular: true
  },
  {
    id: 'jamesclear',
    title: 'James Clear',
    description: 'نویسنده کتاب عادت‌های اتمی؛ ایجاد عادت‌های ماندگار و بهبود مداوم روزانه',
    url: 'https://jamesclear.com/feed',
    siteUrl: 'https://jamesclear.com',
    category: 'سبک زندگی، فرهنگ و یادگیری',
    icon: 'zap',
    isPopular: true
  },
  {
    id: 'hubermanlab',
    title: 'Huberman Lab',
    description: 'بینش‌های علوم اعصاب دکتر اندرو هوبرمن برای بهینه‌سازی خواب، تمرکز و سلامت',
    url: 'https://hubermanlab.com/feed/',
    siteUrl: 'https://hubermanlab.com',
    category: 'سبک زندگی، فرهنگ و یادگیری',
    icon: 'activity',
    isPopular: true
  },
  {
    id: 'chetor',
    title: 'چطور (Chetor)',
    description: 'پایگاه مهارت‌های توسعه فردی، مدیریت استرس، کارآفرینی و سلامت روان',
    url: 'https://www.chetor.com/feed/',
    siteUrl: 'https://www.chetor.com',
    category: 'سبک زندگی، فرهنگ و یادگیری',
    icon: 'smile',
    isPopular: true
  },
  {
    id: '1pezeshk',
    title: 'یک پزشک (1Pezeshk)',
    description: 'وبلاگ خاطره‌انگیز دکتر علیرضا مجیدی پیرامون کتاب، تاریخ، سینما و فناوری',
    url: 'https://1pezeshk.com/feed',
    siteUrl: 'https://1pezeshk.com',
    category: 'سبک زندگی، فرهنگ و یادگیری',
    icon: 'book-open',
    isPopular: true
  },
  {
    id: 'shenoto',
    title: 'شنوتو (پادکست و کتاب صوتی)',
    description: 'تازه‌ترین پادکست‌های فارسی در حوزه تاریخ، روانشناسی، توسعه فردی و داستان',
    url: 'https://shenoto.com/feed',
    siteUrl: 'https://shenoto.com',
    category: 'سبک زندگی، فرهنگ و یادگیری',
    icon: 'headphones',
    isPopular: false
  },
  {
    id: 'bookofi',
    title: 'بوکوفی (معرفی کتاب)',
    description: 'خلاصه و نقد بهترین کتاب‌های داستانی، روانشناسی و فلسفی جهان',
    url: 'https://bookofi.com/feed/',
    siteUrl: 'https://bookofi.com',
    category: 'سبک زندگی، فرهنگ و یادگیری',
    icon: 'book',
    isPopular: false
  },
  {
    id: 'tinybuddha',
    title: 'Tiny Buddha',
    description: 'داستان‌های واقعی درباره صلح درونی، پذیرش خویشتن و روابط انسانی سالم',
    url: 'https://tinybuddha.com/feed/',
    siteUrl: 'https://tinybuddha.com',
    category: 'سبک زندگی، فرهنگ و یادگیری',
    icon: 'heart',
    isPopular: false
  },
  {
    id: 'bbc-future',
    title: 'BBC Future',
    description: 'نگاهی عمیق به جامعه آینده، چالش‌های اخلاقی و تغییر الگوهای زندگی بشری',
    url: 'https://feeds.bbci.co.uk/future/rss.xml',
    siteUrl: 'https://www.bbc.com/future',
    category: 'سبک زندگی، فرهنگ و یادگیری',
    icon: 'compass',
    isPopular: false
  },
  {
    id: 'bbc-culture',
    title: 'BBC Culture',
    description: 'روایت‌هایی از سینما، تاریخ هنر، ادبیات داستانی و شاهکارهای فرهنگی جهان',
    url: 'https://feeds.bbci.co.uk/culture/rss.xml',
    siteUrl: 'https://www.bbc.com/culture',
    category: 'سبک زندگی، فرهنگ و یادگیری',
    icon: 'camera',
    isPopular: false
  },
  {
    id: 'newyorker',
    title: 'The New Yorker',
    description: 'جستارهای ادبی فاخر، طنز، گزارش‌های جامعه‌شناختی و شعر معاصر',
    url: 'https://www.newyorker.com/feed/everything',
    siteUrl: 'https://www.newyorker.com',
    category: 'سبک زندگی، فرهنگ و یادگیری',
    icon: 'file-text',
    isPopular: false
  },
  {
    id: 'sethgodin',
    title: "Seth Godin's Blog",
    description: 'یادداشت‌های فشرده و تفکربرانگیز ست گادین درباره بازاریابی، هنر و شهامت نوآوری',
    url: 'https://seths.blog/feed/',
    siteUrl: 'https://seths.blog',
    category: 'سبک زندگی، فرهنگ و یادگیری',
    icon: 'lightbulb',
    isPopular: false
  },
  {
    id: 'theatlantic',
    title: 'The Atlantic',
    description: 'جستارهای برجسته در نقد جامعه معاصر، روانشناسی روابط و فرهنگ عمومی',
    url: 'https://www.theatlantic.com/feed/all/',
    siteUrl: 'https://www.theatlantic.com',
    category: 'سبک زندگی، فرهنگ و یادگیری',
    icon: 'globe',
    isPopular: false
  },
  {
    id: 'behance-mag',
    title: 'Behance Editorial',
    description: 'نمایش خلاقیت‌های الهام‌بخش هنرمندان جهان، عکاسی و طراحی تجسمی',
    url: 'https://www.behance.net/blog/feed/',
    siteUrl: 'https://www.behance.net/blog',
    category: 'سبک زندگی، فرهنگ و یادگیری',
    icon: 'image',
    isPopular: false
  },
  {
    id: 'nesslabs',
    title: 'Ness Labs',
    description: 'راهنماهای عصب‌شناختی برای یادگیری موثر، یادداشت‌برداری هوشمند و تفکر خلاق',
    url: 'https://nesslabs.com/feed',
    siteUrl: 'https://nesslabs.com',
    category: 'سبک زندگی، فرهنگ و یادگیری',
    icon: 'coffee',
    isPopular: false
  },
  {
    id: 'vox',
    title: 'Vox Explainers',
    description: 'روایت شفاف و آموزنده از پیچیده‌ترین مسائل فرهنگی، اجتماعی و تاریخی روز',
    url: 'https://www.vox.com/rss/index.xml',
    siteUrl: 'https://www.vox.com',
    category: 'سبک زندگی، فرهنگ و یادگیری',
    icon: 'help-circle',
    isPopular: false
  },
  {
    id: 'khabgard',
    title: 'خوابگرد (ادبیات و نشر)',
    description: 'وبلاگ تخصصی ادبیات معاصر، زبان و نگارش فارسی و معرفی تازه‌های نشر کتاب',
    url: 'https://khabgard.com/feed/',
    siteUrl: 'https://khabgard.com',
    category: 'سبک زندگی، فرهنگ و یادگیری',
    icon: 'bookmark',
    isPopular: false
  }
];
