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
  // Tech & Startups (International & Local)
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

  // AI & Data
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
    id: 'github-blog',
    title: 'GitHub Blog',
    description: 'به‌روزرسانی‌های جامعه متن‌باز، گیت‌هاب کوپایلوت و مهندسی نرم‌افزار',
    url: 'https://github.blog/feed/',
    siteUrl: 'https://github.blog',
    category: 'هوش مصنوعی و داده',
    icon: 'git-branch',
    isPopular: false
  },

  // News & Geopolitics
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

  // Science & Research
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
    isPopular: false
  },

  // Design & UX
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
  }
];
