// ═══════════════════════════════════════════════════════════
// TruthGuard — i18n (Internationalisation) System
// Languages: English, Spanish, Georgian, Arabic, French,
//            German, Chinese (Simplified), Hindi
// ═══════════════════════════════════════════════════════════

const LANGUAGES = {
  en: { label: "English",    flag: "🇬🇧", dir: "ltr" },
  es: { label: "Español",    flag: "🇪🇸", dir: "ltr" },
  ka: { label: "ქართული",   flag: "🇬🇪", dir: "ltr" },
  ar: { label: "العربية",   flag: "🇸🇦", dir: "rtl" },
  fr: { label: "Français",   flag: "🇫🇷", dir: "ltr" },
  de: { label: "Deutsch",    flag: "🇩🇪", dir: "ltr" },
  zh: { label: "中文",        flag: "🇨🇳", dir: "ltr" },
  hi: { label: "हिन्दी",     flag: "🇮🇳", dir: "ltr" },
};

const TRANSLATIONS = {

  // ── NAV ────────────────────────────────────────────────
  nav_text:       { en:"Text Detector", es:"Detector de Texto", ka:"ტექსტის დეტექტორი", ar:"كاشف النصوص", fr:"Détecteur de Texte", de:"Textdetektor", zh:"文本检测", hi:"टेक्स्ट डिटेक्टर" },
  nav_media:      { en:"Media Detector", es:"Detector de Medios", ka:"მედია დეტექტორი", ar:"كاشف الوسائط", fr:"Détecteur Média", de:"Mediendetektor", zh:"媒体检测", hi:"मीडिया डिटेक्टर" },
  nav_how:        { en:"How it works", es:"Cómo funciona", ka:"როგორ მუშაობს", ar:"كيف يعمل", fr:"Comment ça marche", de:"So funktioniert's", zh:"工作原理", hi:"यह कैसे काम करता है" },
  nav_about:      { en:"About", es:"Acerca de", ka:"შესახებ", ar:"حول", fr:"À propos", de:"Über uns", zh:"关于", hi:"के बारे में" },
  nav_api:        { en:"API", es:"API", ka:"API", ar:"API", fr:"API", de:"API", zh:"API", hi:"API" },

  // ── INDEX PAGE ─────────────────────────────────────────
  hero_label:     { en:"AI-Powered Verification", es:"Verificación con IA", ka:"AI-ით გამოწვეული გადამოწმება", ar:"التحقق بالذكاء الاصطناعي", fr:"Vérification par IA", de:"KI-gestützte Verifizierung", zh:"AI 驱动的核实", hi:"AI-संचालित सत्यापन" },
  hero_h1a:       { en:"Is this news", es:"¿Esta noticia es", ka:"ეს სიახლე", ar:"هل هذا الخبر", fr:"Cette info est-elle", de:"Ist diese Nachricht", zh:"这条新闻是", hi:"क्या यह खबर" },
  hero_h1b:       { en:"real", es:"real", ka:"რეალური", ar:"حقيقي", fr:"vraie", de:"echt", zh:"真实的", hi:"सच्ची" },
  hero_h1c:       { en:"or fake?", es:"o falsa?", ka:"თუ ყალბი?", ar:"أم مزيف؟", fr:"ou fausse ?", de:"oder fake?", zh:"还是假的？", hi:"या नकली?" },
  hero_sub:       { en:"Paste any article, headline, or claim and our model will analyse it in seconds.", es:"Pega cualquier artículo, titular o afirmación y nuestro modelo lo analizará en segundos.", ka:"ჩასვით ნებისმიერი სტატია, სათაური ან განცხადება და ჩვენი მოდელი გაანალიზებს მათ წამებში.", ar:"الصق أي مقال أو عنوان أو ادعاء وسيقوم نموذجنا بتحليله في ثوانٍ.", fr:"Collez n'importe quel article, titre ou affirmation et notre modèle l'analysera en quelques secondes.", de:"Füge einen Artikel, eine Überschrift oder eine Behauptung ein — unser Modell analysiert sie in Sekunden.", zh:"粘贴任意文章、标题或声明，我们的模型将在数秒内完成分析。", hi:"कोई भी लेख, शीर्षक या दावा पेस्ट करें और हमारा मॉडल इसे कुछ ही सेकंड में विश्लेषण करेगा।" },
  hero_media_btn: { en:"🖼 Also detect AI-generated images & videos →", es:"🖼 También detecta imágenes y vídeos generados por IA →", ka:"🖼 ასევე გამოავლინე AI-ით შექმნილი სურათები და ვიდეოები →", ar:"🖼 اكتشف أيضاً الصور ومقاطع الفيديو المولّدة بالذكاء الاصطناعي →", fr:"🖼 Détectez aussi les images et vidéos générées par IA →", de:"🖼 Auch KI-generierte Bilder & Videos erkennen →", zh:"🖼 还可检测 AI 生成的图片和视频 →", hi:"🖼 AI-जनित छवियां और वीडियो भी डिटेक्ट करें →" },

  card_tag:       { en:"LIVE DETECTOR", es:"DETECTOR EN VIVO", ka:"პირდაპირი დეტექტორი", ar:"الكاشف المباشر", fr:"DÉTECTEUR EN DIRECT", de:"LIVE-DETEKTOR", zh:"实时检测", hi:"लाइव डिटेक्टर" },
  textarea_ph:    { en:"Paste a news article, headline, or any text you want to verify…", es:"Pega un artículo de noticias, titular o cualquier texto que quieras verificar…", ka:"ჩასვით სიახლის სტატია, სათაური ან ნებისმიერი ტექსტი, რომლის გადამოწმებაც გსურთ…", ar:"الصق مقالاً إخبارياً أو عنواناً أو أي نص تريد التحقق منه…", fr:"Collez un article, un titre ou tout texte à vérifier…", de:"Füge einen Nachrichtenartikel, eine Überschrift oder einen Text zum Prüfen ein…", zh:"粘贴新闻文章、标题或任何您想核实的文本…", hi:"कोई समाचार लेख, शीर्षक या कोई भी टेक्स्ट पेस्ट करें जिसे आप सत्यापित करना चाहते हैं…" },
  btn_analyse:    { en:"Analyse Text", es:"Analizar Texto", ka:"ტექსტის ანალიზი", ar:"تحليل النص", fr:"Analyser le texte", de:"Text analysieren", zh:"分析文本", hi:"टेक्स्ट विश्लेषण करें" },
  btn_analysing:  { en:"Analysing", es:"Analizando", ka:"მიმდინარეობს ანალიზი", ar:"جارٍ التحليل", fr:"Analyse en cours", de:"Analysiere…", zh:"正在分析", hi:"विश्लेषण हो रहा है" },
  btn_clear:      { en:"Clear", es:"Limpiar", ka:"გასუფთავება", ar:"مسح", fr:"Effacer", de:"Löschen", zh:"清除", hi:"साफ़ करें" },

  conf_label:     { en:"Confidence", es:"Confianza", ka:"სანდოობა", ar:"الثقة", fr:"Confiance", de:"Konfidenz", zh:"置信度", hi:"विश्वास" },
  words_label:    { en:"words", es:"palabras", ka:"სიტყვა", ar:"كلمات", fr:"mots", de:"Wörter", zh:"字", hi:"शब्द" },
  chars_label:    { en:"chars", es:"caracteres", ka:"სიმბოლო", ar:"حروف", fr:"caractères", de:"Zeichen", zh:"字符", hi:"अक्षर" },
  ms_label:       { en:"ms", es:"ms", ka:"ms", ar:"ms", fr:"ms", de:"ms", zh:"ms", hi:"ms" },

  log_title:      { en:"Fake Detections", es:"Detecciones Falsas", ka:"ყალბი გამოვლენები", ar:"الاكتشافات المزيفة", fr:"Détections Fausses", de:"Fake-Erkennungen", zh:"假新闻记录", hi:"नकली पहचान" },
  log_empty:      { en:"No fake news detected yet. Results will appear here.", es:"Aún no se ha detectado noticias falsas. Los resultados aparecerán aquí.", ka:"ჯერ ყალბი სიახლეები არ გამოვლენილა. შედეგები გამოჩნდება აქ.", ar:"لم يتم اكتشاف أخبار مزيفة بعد. ستظهر النتائج هنا.", fr:"Aucune fausse information détectée pour l'instant. Les résultats apparaîtront ici.", de:"Noch keine Falschmeldungen erkannt. Ergebnisse erscheinen hier.", zh:"尚未检测到假新闻，结果将显示在这里。", hi:"अभी तक कोई फर्जी खबर नहीं मिली। परिणाम यहाँ दिखाई देंगे।" },
  log_clear:      { en:"Clear log", es:"Limpiar registro", ka:"ჟურნალის გასუფთავება", ar:"مسح السجل", fr:"Effacer le journal", de:"Protokoll löschen", zh:"清除记录", hi:"लॉग साफ़ करें" },

  hiw_label:      { en:"METHODOLOGY", es:"METODOLOGÍA", ka:"მეთოდოლოგია", ar:"المنهجية", fr:"MÉTHODOLOGIE", de:"METHODIK", zh:"方法论", hi:"कार्यप्रणाली" },
  hiw_title:      { en:"How TruthGuard works", es:"Cómo funciona TruthGuard", ka:"როგორ მუშაობს TruthGuard", ar:"كيف يعمل TruthGuard", fr:"Comment fonctionne TruthGuard", de:"Wie TruthGuard funktioniert", zh:"TruthGuard 如何工作", hi:"TruthGuard कैसे काम करता है" },
  step1_title:    { en:"Text Ingestion", es:"Ingesta de Texto", ka:"ტექსტის შეყვანა", ar:"إدخال النص", fr:"Ingestion du texte", de:"Textverarbeitung", zh:"文本摄取", hi:"टेक्स्ट अंतर्ग्रहण" },
  step1_desc:     { en:"Your text is tokenised and pre-processed — stripping noise while preserving linguistic signals that matter.", es:"Tu texto es tokenizado y preprocesado — eliminando ruido mientras se preservan las señales lingüísticas importantes.", ka:"თქვენი ტექსტი ტოკენიზდება და წინასწარ მუშავდება — ხმაური იხსნება, ხოლო მნიშვნელოვანი ლინგვისტური სიგნალები ინარჩუნება.", ar:"يتم ترميز نصك ومعالجته مسبقاً — إزالة الضوضاء مع الحفاظ على الإشارات اللغوية المهمة.", fr:"Votre texte est tokenisé et prétraité — le bruit est supprimé tout en préservant les signaux linguistiques importants.", de:"Ihr Text wird tokenisiert und vorverarbeitet — Rauschen wird entfernt, wichtige Sprachsignale bleiben erhalten.", zh:"您的文本会被分词和预处理——去除噪音，同时保留重要的语言信号。", hi:"आपका टेक्स्ट टोकनाइज़ और प्री-प्रोसेस किया जाता है — शोर हटाते हुए महत्वपूर्ण भाषाई संकेत सुरक्षित रखे जाते हैं।" },
  step2_title:    { en:"Model Inference", es:"Inferencia del Modelo", ka:"მოდელის დასკვნა", ar:"استنتاج النموذج", fr:"Inférence du modèle", de:"Modell-Inferenz", zh:"模型推理", hi:"मॉडल अनुमान" },
  step2_desc:     { en:"A fine-tuned transformer model analyses semantic patterns, sentiment bias, and factual inconsistencies.", es:"Un modelo transformer ajustado analiza patrones semánticos, sesgo de sentimiento e inconsistencias factuales.", ka:"დახვეწილი ტრანსფორმერის მოდელი აანალიზებს სემანტიკურ პატერნებს, სენტიმენტის მიკერძოებას და ფაქტობრივ შეუსაბამობებს.", ar:"يحلل نموذج محول دقيق الضبط الأنماط الدلالية وتحيز المشاعر والتناقضات الواقعية.", fr:"Un modèle transformeur affiné analyse les patterns sémantiques, les biais de sentiment et les incohérences factuelles.", de:"Ein fein abgestimmtes Transformer-Modell analysiert semantische Muster, Sentiment-Verzerrungen und faktische Inkonsistenzen.", zh:"经过微调的 Transformer 模型分析语义模式、情感偏见和事实不一致。", hi:"एक फाइन-ट्यून्ड ट्रांसफॉर्मर मॉडल सिमेंटिक पैटर्न, भावना पूर्वाग्रह और तथ्यात्मक असंगति का विश्लेषण करता है।" },
  step3_title:    { en:"Confidence Scoring", es:"Puntuación de Confianza", ka:"სანდოობის ქულა", ar:"تسجيل الثقة", fr:"Score de confiance", de:"Konfidenz-Bewertung", zh:"置信度评分", hi:"विश्वास स्कोरिंग" },
  step3_desc:     { en:"The model returns a probability distribution across FAKE and REAL, giving you a clear, interpretable score.", es:"El modelo devuelve una distribución de probabilidad entre FALSO y REAL, dándote una puntuación clara e interpretable.", ka:"მოდელი აბრუნებს ალბათობის განაწილებას FAKE-სა და REAL-ს შორის, რაც გაძლევთ მკაფიო, ინტერპრეტირებად ქულას.", ar:"يُعيد النموذج توزيعاً احتمالياً بين FAKE و REAL، مما يمنحك درجة واضحة وقابلة للتفسير.", fr:"Le modèle renvoie une distribution de probabilité entre FAKE et REAL, vous donnant un score clair et interprétable.", de:"Das Modell liefert eine Wahrscheinlichkeitsverteilung zwischen FAKE und REAL — ein klarer, interpretierbarer Score.", zh:"模型返回 FAKE 和 REAL 之间的概率分布，给您一个清晰、可解释的分数。", hi:"मॉडल FAKE और REAL के बीच एक संभावना वितरण लौटाता है, जो आपको एक स्पष्ट, व्याख्यायोग्य स्कोर देता है।" },

  about_label:    { en:"ABOUT", es:"ACERCA DE", ka:"შესახებ", ar:"حول", fr:"À PROPOS", de:"ÜBER UNS", zh:"关于", hi:"के बारे में" },
  about_h2:       { en:"Built for the age of misinformation", es:"Construido para la era de la desinformación", ka:"შექმნილია დეზინფორმაციის ეპოქისთვის", ar:"مبني لعصر المعلومات المضللة", fr:"Conçu pour l'ère de la désinformation", de:"Gebaut für das Zeitalter der Desinformation", zh:"为虚假信息时代而生", hi:"गलत सूचना के युग के लिए निर्मित" },
  about_p1:       { en:"TruthGuard uses a state-of-the-art NLP model trained on thousands of verified news articles and known misinformation examples. It's designed for journalists, researchers, and curious readers who want a second opinion.", es:"TruthGuard usa un modelo NLP de última generación entrenado en miles de artículos verificados y ejemplos conocidos de desinformación. Está diseñado para periodistas, investigadores y lectores curiosos que quieren una segunda opinión.", ka:"TruthGuard იყენებს უახლეს NLP მოდელს, რომელიც გაწვრთნილია ათასობით გადამოწმებულ სიახლეზე და ცნობილ დეზინფორმაციის მაგალითებზე. იგი შექმნილია ჟურნალისტების, მკვლევარებისა და ცნობისმოყვარე მკითხველებისთვის.", ar:"يستخدم TruthGuard نموذج معالجة لغة طبيعية متطوراً مدرباً على آلاف المقالات الإخبارية الموثقة وأمثلة التضليل المعروفة.", fr:"TruthGuard utilise un modèle NLP de pointe entraîné sur des milliers d'articles vérifiés et d'exemples de désinformation connus.", de:"TruthGuard verwendet ein hochmodernes NLP-Modell, das auf Tausenden verifizierter Nachrichtenartikel und bekannter Fehlinformationsbeispiele trainiert wurde.", zh:"TruthGuard 使用最先进的 NLP 模型，该模型在数千篇经过验证的新闻文章和已知错误信息示例上进行训练。", hi:"TruthGuard एक अत्याधुनिक NLP मॉडल का उपयोग करता है जो हजारों सत्यापित समाचार लेखों और ज्ञात गलत सूचना उदाहरणों पर प्रशिक्षित है।" },
  about_p2:       { en:"The system exposes a simple REST API so you can integrate fake-news detection directly into your own applications.", es:"El sistema expone una API REST simple para que puedas integrar la detección de noticias falsas directamente en tus propias aplicaciones.", ka:"სისტემა ამოაქვეყნებს მარტივ REST API-ს, რათა შეძლოთ ყალბი სიახლეების გამოვლენის ინტეგრირება პირდაპირ თქვენს აპლიკაციებში.", ar:"يكشف النظام عن واجهة برمجة تطبيقات REST بسيطة حتى تتمكن من دمج كشف الأخبار المزيفة مباشرة في تطبيقاتك.", fr:"Le système expose une API REST simple pour intégrer la détection de fausses nouvelles directement dans vos applications.", de:"Das System stellt eine einfache REST-API bereit, mit der Sie die Falschmeldungserkennung direkt in Ihre eigenen Anwendungen integrieren können.", zh:"该系统提供一个简单的 REST API，让您可以将假新闻检测直接集成到自己的应用程序中。", hi:"सिस्टम एक सरल REST API प्रदान करता है ताकि आप नकली समाचार पहचान को सीधे अपने अनुप्रयोगों में एकीकृत कर सकें।" },

  footer_p:       { en:"Powered by your trained model · Flask REST API · Built with intent", es:"Impulsado por tu modelo entrenado · Flask REST API · Construido con intención", ka:"თქვენი გაწვრთნილი მოდელით · Flask REST API · შექმნილია მიზნით", ar:"مدعوم بنموذجك المدرب · Flask REST API · مبني بقصد", fr:"Propulsé par votre modèle entraîné · Flask REST API · Construit avec intention", de:"Betrieben von Ihrem trainierten Modell · Flask REST API · Mit Absicht gebaut", zh:"由您训练的模型驱动 · Flask REST API · 用心构建", hi:"आपके प्रशिक्षित मॉडल द्वारा संचालित · Flask REST API · इरादे के साथ बनाया गया" },

  // ── HOW IT WORKS PAGE ──────────────────────────────────
  hiw_page_label: { en:"Methodology", es:"Metodología", ka:"მეთოდოლოგია", ar:"المنهجية", fr:"Méthodologie", de:"Methodik", zh:"方法论", hi:"कार्यप्रणाली" },
  hiw_page_h1a:   { en:"How", es:"Cómo", ka:"როგორ", ar:"كيف", fr:"Comment", de:"Wie", zh:"TruthGuard", hi:"TruthGuard" },
  hiw_page_h1b:   { en:"TruthGuard", es:"TruthGuard", ka:"TruthGuard", ar:"TruthGuard", fr:"TruthGuard", de:"TruthGuard", zh:"如何", hi:"कैसे" },
  hiw_page_h1c:   { en:"works", es:"funciona", ka:"მუშაობს", ar:"يعمل", fr:"fonctionne", de:"funktioniert", zh:"运作", hi:"काम करता है" },
  hiw_page_sub:   { en:"A look inside the pipeline that turns raw text into a trustworthy verdict.", es:"Una mirada dentro del proceso que convierte texto en bruto en un veredicto confiable.", ka:"შეხედეთ კონვეიერს, რომელიც ნედლ ტექსტს სანდო განაჩენად გარდაქმნის.", ar:"نظرة داخل خط الأنابيب الذي يحوّل النص الخام إلى حكم موثوق.", fr:"Un aperçu du pipeline qui transforme un texte brut en verdict fiable.", de:"Ein Blick in die Pipeline, die Rohtext in ein zuverlässiges Urteil verwandelt.", zh:"深入了解将原始文本转化为可信裁定的流程。", hi:"उस पाइपलाइन के अंदर एक नज़र जो कच्चे टेक्स्ट को एक विश्वसनीय फैसले में बदलती है।" },

  hiw_s1_title:   { en:"Text Ingestion", es:"Ingesta de Texto", ka:"ტექსტის შეყვანა", ar:"إدخال النص", fr:"Ingestion du texte", de:"Textverarbeitung", zh:"文本摄取", hi:"टेक्स्ट अंतर्ग्रहण" },
  hiw_s1_p:       { en:"When you paste text into TruthGuard, it's immediately cleaned and normalised. HTML tags, excess whitespace, and encoding artefacts are stripped away. What remains is the raw linguistic signal — the vocabulary, sentence structure, and rhetorical patterns that actually matter to the model.", es:"Cuando pegas texto en TruthGuard, se limpia y normaliza inmediatamente. Las etiquetas HTML, el exceso de espacios en blanco y los artefactos de codificación se eliminan. Lo que queda es la señal lingüística pura.", ka:"როდესაც ჩასვამთ ტექსტს TruthGuard-ში, იგი დაუყოვნებლივ იწმინდება და ნორმალიზდება. HTML ტეგები, ზედმეტი სივრცეები და კოდირების არტეფაქტები იხსნება.", ar:"عندما تلصق النص في TruthGuard، يتم تنظيفه وتطبيعه على الفور. تتم إزالة علامات HTML والمسافات الزائدة وعيوب الترميز.", fr:"Lorsque vous collez du texte dans TruthGuard, il est immédiatement nettoyé et normalisé. Les balises HTML, les espaces excessifs et les artefacts d'encodage sont supprimés.", de:"Wenn Sie Text in TruthGuard einfügen, wird er sofort bereinigt und normalisiert. HTML-Tags, übermäßige Leerzeichen und Kodierungsartefakte werden entfernt.", zh:"当您将文本粘贴到 TruthGuard 中时，它会立即被清理和规范化。HTML 标签、多余的空白和编码痕迹都会被去除。", hi:"जब आप TruthGuard में टेक्स्ट पेस्ट करते हैं, तो इसे तुरंत साफ और सामान्य किया जाता है। HTML टैग, अतिरिक्त व्हाइटस्पेस और एन्कोडिंग आर्टिफैक्ट हटा दिए जाते हैं।" },
  hiw_s2_title:   { en:"Model Inference", es:"Inferencia del Modelo", ka:"მოდელის დასკვნა", ar:"استنتاج النموذج", fr:"Inférence du modèle", de:"Modell-Inferenz", zh:"模型推理", hi:"मॉडल अनुमान" },
  hiw_s2_p:       { en:"The cleaned text is passed through a fine-tuned transformer model. Unlike simple keyword matching, the model reads context — it understands that the same word can carry different meaning depending on what surrounds it.", es:"El texto limpio pasa por un modelo transformer ajustado. A diferencia de la simple coincidencia de palabras clave, el modelo lee el contexto.", ka:"გაწმენდილი ტექსტი გადის დახვეწილ ტრანსფორმერის მოდელში. მარტივი საკვანძო სიტყვების შედარებისგან განსხვავებით, მოდელი კითხულობს კონტექსტს.", ar:"يمر النص المنقى عبر نموذج محول دقيق الضبط. على عكس مطابقة الكلمات الرئيسية البسيطة، يقرأ النموذج السياق.", fr:"Le texte nettoyé est passé à travers un modèle transformeur affiné. Contrairement à la simple correspondance de mots-clés, le modèle lit le contexte.", de:"Der bereinigte Text wird durch ein fein abgestimmtes Transformer-Modell geleitet. Anders als bei einfachem Keyword-Matching liest das Modell den Kontext.", zh:"清理后的文本通过经过微调的 Transformer 模型处理。与简单的关键词匹配不同，模型能理解上下文。", hi:"साफ किया गया टेक्स्ट एक फाइन-ट्यून्ड ट्रांसफॉर्मर मॉडल से गुजरता है। सरल कीवर्ड मिलान के विपरीत, मॉडल संदर्भ पढ़ता है।" },
  hiw_s3_title:   { en:"Confidence Scoring", es:"Puntuación de Confianza", ka:"სანდოობის ქულა", ar:"تسجيل الثقة", fr:"Score de confiance", de:"Konfidenz-Bewertung", zh:"置信度评分", hi:"विश्वास स्कोरिंग" },
  hiw_s3_p:       { en:"The model doesn't just output a binary label. It produces a probability distribution across both classes — FAKE and REAL. The confidence score tells you how certain the model is.", es:"El modelo no solo produce una etiqueta binaria. Produce una distribución de probabilidad entre ambas clases — FALSO y REAL.", ka:"მოდელი არ გამოაქვს მხოლოდ ბინარული ლეიბლი. იგი ქმნის ალბათობის განაწილებას ორივე კლასში — FAKE და REAL.", ar:"لا يُخرج النموذج مجرد تسمية ثنائية. بل ينتج توزيعاً احتمالياً عبر كلتا الفئتين — FAKE و REAL.", fr:"Le modèle ne produit pas seulement une étiquette binaire. Il produit une distribution de probabilité sur les deux classes — FAKE et REAL.", de:"Das Modell gibt nicht nur ein binäres Label aus. Es erzeugt eine Wahrscheinlichkeitsverteilung über beide Klassen — FAKE und REAL.", zh:"模型不只输出二元标签，而是在两个类别（FAKE 和 REAL）之间生成概率分布。", hi:"मॉडल केवल एक बाइनरी लेबल आउटपुट नहीं करता। यह दोनों वर्गों — FAKE और REAL — में एक संभावना वितरण उत्पन्न करता है।" },
  hiw_s4_title:   { en:"Result Delivery", es:"Entrega de Resultados", ka:"შედეგის მიწოდება", ar:"تسليم النتائج", fr:"Livraison des résultats", de:"Ergebnislieferung", zh:"结果呈现", hi:"परिणाम वितरण" },
  hiw_s4_p:       { en:"The verdict is returned via a simple JSON response and rendered live in the interface. The same response is available through the REST API, so you can integrate TruthGuard into your own apps.", es:"El veredicto se devuelve mediante una respuesta JSON simple y se muestra en vivo en la interfaz. La misma respuesta está disponible a través de la REST API.", ka:"განაჩენი მოდის მარტივი JSON პასუხის სახით და ჩანს ინტერფეისში. იგივე პასუხი ხელმისაწვდომია REST API-ის მეშვეობით.", ar:"يتم إرجاع الحكم عبر استجابة JSON بسيطة ويُعرض مباشرة في الواجهة.", fr:"Le verdict est renvoyé via une réponse JSON simple et affiché en direct dans l'interface.", de:"Das Urteil wird über eine einfache JSON-Antwort zurückgegeben und live in der Oberfläche gerendert.", zh:"裁定通过简单的 JSON 响应返回并在界面中实时呈现。同样的响应也可通过 REST API 获得。", hi:"फैसला एक सरल JSON प्रतिक्रिया के माध्यम से लौटाया जाता है और इंटरफेस में लाइव प्रस्तुत किया जाता है।" },

  signals_label:  { en:"SIGNAL TYPES", es:"TIPOS DE SEÑALES", ka:"სიგნალის ტიპები", ar:"أنواع الإشارات", fr:"TYPES DE SIGNAUX", de:"SIGNALTYPEN", zh:"信号类型", hi:"संकेत प्रकार" },
  signals_h2:     { en:"What the model looks for", es:"Qué busca el modelo", ka:"რას ეძებს მოდელი", ar:"ما يبحث عنه النموذج", fr:"Ce que le modèle recherche", de:"Wonach das Modell sucht", zh:"模型寻找什么", hi:"मॉडल क्या देखता है" },
  sig1_title:     { en:"Emotional language", es:"Lenguaje emocional", ka:"ემოციური ენა", ar:"اللغة العاطفية", fr:"Langage émotionnel", de:"Emotionale Sprache", zh:"情绪化语言", hi:"भावनात्मक भाषा" },
  sig1_desc:      { en:"Sensational adjectives, all-caps words, and extreme superlatives that aim to provoke rather than inform.", es:"Adjetivos sensacionalistas, palabras en mayúsculas y superlativos extremos que buscan provocar en lugar de informar.", ka:"სენსაციური ზედსართავები, სრულად დიდი ასოებით დაწერილი სიტყვები და უკიდურესი ზეპოზიტივები.", ar:"الصفات المثيرة والكلمات بأحرف كبيرة والمبالغات المتطرفة التي تهدف إلى الاستفزاز بدلاً من الإعلام.", fr:"Adjectifs sensationnalistes, mots en majuscules et superlatifs extrêmes visant à provoquer plutôt qu'à informer.", de:"Sensationelle Adjektive, Wörter in Großbuchstaben und extreme Superlative, die eher provozieren als informieren wollen.", zh:"耸人听闻的形容词、全大写单词和极端最高级，目的在于煽动而非告知。", hi:"सनसनीखेज विशेषण, सभी बड़े अक्षरों वाले शब्द, और चरम अतिशयोक्ति जो सूचित करने की बजाय उकसाने का लक्ष्य रखते हैं।" },
  sig2_title:     { en:"Vague sourcing", es:"Fuentes vagas", ka:"ბუნდოვანი წყაროები", ar:"مصادر غامضة", fr:"Sources vagues", de:"Vage Quellen", zh:"模糊信源", hi:"अस्पष्ट स्रोत" },
  sig2_desc:      { en:"Claims attributed to unnamed experts, anonymous insiders, or unverifiable studies with no citations.", es:"Afirmaciones atribuidas a expertos sin nombre, personas internas anónimas o estudios no verificables sin citas.", ka:"ანონიმური ექსპერტების, უცნობი ინსაიდერების ან შეუმოწმებელი კვლევების მიერ მიწოდებული განცხადებები.", ar:"ادعاءات منسوبة إلى خبراء مجهولين أو مطلعين مجهولي الهوية أو دراسات غير قابلة للتحقق.", fr:"Affirmations attribuées à des experts anonymes, des initiés anonymes, ou des études invérifiables sans citations.", de:"Behauptungen, die ungenannten Experten, anonymen Insidern oder nicht nachprüfbaren Studien ohne Quellenangaben zugeschrieben werden.", zh:"归因于不知名专家、匿名内部人士或无法核实的研究（无引用）的声明。", hi:"अनाम विशेषज्ञों, गुमनाम अंदरूनी लोगों, या बिना उद्धरण के अप्रमाणित अध्ययनों से जुड़े दावे।" },
  sig3_title:     { en:"Logical inconsistency", es:"Inconsistencia lógica", ka:"ლოგიკური შეუსაბამობა", ar:"التناقض المنطقي", fr:"Incohérence logique", de:"Logische Inkonsistenz", zh:"逻辑不一致", hi:"तार्किक असंगति" },
  sig3_desc:      { en:"Contradictions within the same article, or conclusions that don't follow from the stated premises.", es:"Contradicciones dentro del mismo artículo, o conclusiones que no se derivan de las premisas establecidas.", ka:"წინააღმდეგობები ერთ სტატიაში, ან დასკვნები, რომლებიც არ გამომდინარეობს განცხადებული პრემისებიდან.", ar:"التناقضات داخل نفس المقال، أو الاستنتاجات التي لا تتبع من المقدمات المذكورة.", fr:"Contradictions au sein du même article, ou conclusions ne découlant pas des prémisses énoncées.", de:"Widersprüche innerhalb desselben Artikels oder Schlussfolgerungen, die nicht aus den genannten Prämissen folgen.", zh:"同一文章内的矛盾，或不符合所述前提的结论。", hi:"एक ही लेख में विरोधाभास, या ऐसे निष्कर्ष जो बताई गई मान्यताओं से नहीं निकलते।" },
  sig4_title:     { en:"Neutral tone", es:"Tono neutral", ka:"ნეიტრალური ტონი", ar:"النبرة المحايدة", fr:"Ton neutre", de:"Neutraler Ton", zh:"中立语气", hi:"तटस्थ स्वर" },
  sig4_desc:      { en:"Measured, factual language that presents evidence without telling the reader how to feel about it.", es:"Lenguaje medido y factual que presenta evidencia sin decirle al lector cómo sentirse.", ka:"გაზომილი, ფაქტობრივი ენა, რომელიც წარმოადგენს მტკიცებულებებს მკითხველს გრძნობის გარეშე.", ar:"لغة مقيسة وواقعية تقدم الأدلة دون إخبار القارئ بكيفية الشعور حيالها.", fr:"Langage mesuré et factuel qui présente des preuves sans dire au lecteur comment se sentir.", de:"Gemessene, sachliche Sprache, die Beweise vorlegt, ohne dem Leser zu sagen, wie er sich fühlen soll.", zh:"有节制的事实性语言，呈现证据而不告诉读者该有何感受。", hi:"मापी हुई, तथ्यात्मक भाषा जो पाठक को यह बताए बिना साक्ष्य प्रस्तुत करती है कि उन्हें कैसा महसूस करना चाहिए।" },
  sig5_title:     { en:"Verifiable claims", es:"Afirmaciones verificables", ka:"შემოწმებადი განცხადებები", ar:"ادعاءات قابلة للتحقق", fr:"Affirmations vérifiables", de:"Überprüfbare Behauptungen", zh:"可核实的声明", hi:"सत्यापन योग्य दावे" },
  sig5_desc:      { en:"Specific figures, named sources, dates, and institutions that can be cross-referenced independently.", es:"Cifras específicas, fuentes nombradas, fechas e instituciones que se pueden verificar de forma independiente.", ka:"კონკრეტული ციფრები, დასახელებული წყაროები, თარიღები და ინსტიტუტები, რომლებიც შეიძლება დამოუკიდებლად გადამოწმდეს.", ar:"أرقام محددة ومصادر مسماة وتواريخ ومؤسسات يمكن الإسناد المتقاطع إليها بشكل مستقل.", fr:"Chiffres spécifiques, sources nommées, dates et institutions pouvant être recoupées indépendamment.", de:"Spezifische Zahlen, genannte Quellen, Daten und Institutionen, die unabhängig quergeprüft werden können.", zh:"可独立交叉引用的具体数字、指名来源、日期和机构。", hi:"विशिष्ट आंकड़े, नामित स्रोत, तिथियां और संस्थान जिन्हें स्वतंत्र रूप से क्रॉस-रेफर किया जा सकता है।" },
  sig6_title:     { en:"Structured reporting", es:"Reportaje estructurado", ka:"სტრუქტურირებული რეპორტაჟი", ar:"التقارير المنظمة", fr:"Reportage structuré", de:"Strukturierte Berichterstattung", zh:"结构化报道", hi:"संरचित रिपोर्टिंग" },
  sig6_desc:      { en:"Consistent narrative structure that follows journalistic conventions: who, what, when, where, why.", es:"Estructura narrativa consistente que sigue las convenciones periodísticas: quién, qué, cuándo, dónde, por qué.", ka:"თანმიმდევრული ნარატიული სტრუქტურა, რომელიც მიჰყვება ჟურნალისტურ კონვენციებს: ვინ, რა, როდის, სად, რატომ.", ar:"هيكل سردي متسق يتبع الأعراف الصحفية: من، ماذا، متى، أين، لماذا.", fr:"Structure narrative cohérente qui suit les conventions journalistiques : qui, quoi, quand, où, pourquoi.", de:"Konsistente Erzählstruktur, die journalistischen Konventionen folgt: Wer, Was, Wann, Wo, Warum.", zh:"遵循新闻惯例的一致叙事结构：谁、什么、何时、何地、为什么。", hi:"सुसंगत आख्यान संरचना जो पत्रकारिता परंपराओं का पालन करती है: कौन, क्या, कब, कहाँ, क्यों।" },

  limits_label:   { en:"LIMITATIONS", es:"LIMITACIONES", ka:"შეზღუდვები", ar:"القيود", fr:"LIMITES", de:"EINSCHRÄNKUNGEN", zh:"局限性", hi:"सीमाएं" },
  limits_h2:      { en:"What to keep in mind", es:"Qué tener en cuenta", ka:"რა უნდა გახსოვდეთ", ar:"ما يجب مراعاته", fr:"Ce qu'il faut garder à l'esprit", de:"Was zu bedenken ist", zh:"需要注意的事项", hi:"ध्यान में रखने योग्य बातें" },
  limit1:         { en:"TruthGuard is a tool, not an authority. Always cross-reference important claims with trusted sources.", es:"TruthGuard es una herramienta, no una autoridad. Siempre verifica las afirmaciones importantes con fuentes confiables.", ka:"TruthGuard არის ინსტრუმენტი, არა ავტორიტეტი. ყოველთვის გადაამოწმეთ მნიშვნელოვანი განცხადებები სანდო წყაროებით.", ar:"TruthGuard أداة وليست سلطة. تحقق دائمًا من الادعاءات المهمة مع مصادر موثوقة.", fr:"TruthGuard est un outil, pas une autorité. Recoupez toujours les affirmations importantes avec des sources fiables.", de:"TruthGuard ist ein Werkzeug, keine Autorität. Überprüfen Sie wichtige Behauptungen immer mit vertrauenswürdigen Quellen.", zh:"TruthGuard 是一个工具，而非权威。始终用可信来源交叉核实重要声明。", hi:"TruthGuard एक उपकरण है, प्राधिकरण नहीं। महत्वपूर्ण दावों को हमेशा विश्वसनीय स्रोतों से क्रॉस-रेफर करें।" },
  limit2:         { en:"The model performs best on English-language news text. Results on other languages or genres may vary.", es:"El modelo funciona mejor con texto de noticias en inglés. Los resultados en otros idiomas o géneros pueden variar.", ka:"მოდელი საუკეთესოდ მუშაობს ინგლისურენოვან სიახლეებზე. სხვა ენებზე ან ჟანრებში შედეგები შეიძლება განსხვავდებოდეს.", ar:"يعمل النموذج بشكل أفضل على النصوص الإخبارية باللغة الإنجليزية. قد تختلف النتائج على لغات أو أنواع أخرى.", fr:"Le modèle fonctionne mieux sur les textes d'actualité en anglais. Les résultats pour d'autres langues ou genres peuvent varier.", de:"Das Modell funktioniert am besten bei englischsprachigen Nachrichtentexten. Ergebnisse für andere Sprachen oder Genres können variieren.", zh:"该模型在英语新闻文本上表现最佳。其他语言或体裁的结果可能有所不同。", hi:"मॉडल अंग्रेजी भाषा के समाचार पाठ पर सबसे अच्छा प्रदर्शन करता है। अन्य भाषाओं या शैलियों पर परिणाम भिन्न हो सकते हैं।" },
  limit3:         { en:"Short texts (under ~50 words) give the model less signal and may produce lower-confidence results.", es:"Los textos cortos (menos de ~50 palabras) dan menos señal al modelo y pueden producir resultados de menor confianza.", ka:"მოკლე ტექსტები (~50 სიტყვაზე ნაკლები) ნაკლებ სიგნალს აძლევს მოდელს და შეიძლება დაბალი სანდოობის შედეგები მოჰყვეს.", ar:"النصوص القصيرة (أقل من ~50 كلمة) تعطي النموذج إشارة أقل وقد تنتج نتائج ذات ثقة أقل.", fr:"Les textes courts (moins de ~50 mots) donnent moins de signal au modèle et peuvent produire des résultats avec une confiance plus faible.", de:"Kurze Texte (unter ~50 Wörtern) geben dem Modell weniger Signal und können Ergebnisse mit geringerer Konfidenz erzeugen.", zh:"短文本（少于约 50 个词）给模型的信号较少，可能产生置信度较低的结果。", hi:"छोटे टेक्स्ट (~50 शब्दों से कम) मॉडल को कम संकेत देते हैं और कम विश्वास के परिणाम दे सकते हैं।" },
  limit4:         { en:"Sophisticated disinformation that mimics neutral journalistic style may score closer to the boundary.", es:"La desinformación sofisticada que imita el estilo periodístico neutral puede puntuar más cerca del límite.", ka:"დახვეწილი დეზინფორმაცია, რომელიც ნეიტრალური ჟურნალისტური სტილის მიბაძვით, შეიძლება საზღვართან ახლოს დარჩეს.", ar:"قد تحصل المعلومات المضللة المتطورة التي تحاكي الأسلوب الصحفي المحايد على درجات أقرب إلى الحد الفاصل.", fr:"La désinformation sophistiquée qui imite le style journalistique neutre peut obtenir un score plus proche de la frontière.", de:"Ausgefeilte Desinformation, die den neutralen journalistischen Stil nachahmt, kann näher an der Grenze bewertet werden.", zh:"模仿中立新闻风格的复杂虚假信息可能得分更接近边界。", hi:"परिष्कृत दुष्प्रचार जो तटस्थ पत्रकारिता शैली की नकल करता है वह सीमा के करीब स्कोर कर सकता है।" },

  cta_h2:         { en:"Ready to try it?", es:"¿Listo para probarlo?", ka:"მზად ხართ სცადოთ?", ar:"هل أنت مستعد لتجربته؟", fr:"Prêt à l'essayer ?", de:"Bereit es auszuprobieren?", zh:"准备好试试了吗？", hi:"इसे आज़माने के लिए तैयार हैं?" },
  cta_p:          { en:"Paste any article or headline into the detector and get a verdict in seconds.", es:"Pega cualquier artículo o titular en el detector y obtén un veredicto en segundos.", ka:"ჩასვით ნებისმიერი სტატია ან სათაური დეტექტორში და მიიღეთ განაჩენი წამებში.", ar:"الصق أي مقال أو عنوان في الكاشف واحصل على حكم في ثوانٍ.", fr:"Collez n'importe quel article ou titre dans le détecteur et obtenez un verdict en quelques secondes.", de:"Fügen Sie einen Artikel oder eine Überschrift in den Detektor ein und erhalten Sie in Sekunden ein Urteil.", zh:"将任何文章或标题粘贴到检测器中，几秒钟内获得裁定。", hi:"डिटेक्टर में कोई भी लेख या शीर्षक पेस्ट करें और सेकंड में फैसला पाएं।" },
  cta_btn:        { en:"Go to detector →", es:"Ir al detector →", ka:"დეტექტორზე გადასვლა →", ar:"الذهاب إلى الكاشف →", fr:"Aller au détecteur →", de:"Zum Detektor →", zh:"前往检测器 →", hi:"डिटेक्टर पर जाएं →" },

  // ── ABOUT PAGE ─────────────────────────────────────────
  about_page_label:  { en:"Methodology", es:"Metodología", ka:"მეთოდოლოგია", ar:"المنهجية", fr:"Méthodologie", de:"Methodik", zh:"方法论", hi:"कार्यप्रणाली" },
  about_page_h1a:    { en:"How", es:"Cómo", ka:"როგორ", ar:"كيف", fr:"Comment", de:"Wie", zh:"TruthGuard", hi:"TruthGuard" },
  about_page_h1b:    { en:"TruthGuard", es:"TruthGuard", ka:"TruthGuard", ar:"TruthGuard", fr:"TruthGuard", de:"TruthGuard", zh:"如何", hi:"कैसे" },
  about_page_h1c:    { en:"works", es:"funciona", ka:"მუშაობს", ar:"يعمل", fr:"fonctionne", de:"funktioniert", zh:"运作", hi:"काम करता है" },
  about_page_sub:    { en:"A look inside the pipeline that turns raw text into a trustworthy verdict.", es:"Una mirada dentro del proceso que convierte texto en bruto en un veredicto confiable.", ka:"შეხედეთ კონვეიერს, რომელიც ნედლ ტექსტს სანდო განაჩენად გარდაქმნის.", ar:"نظرة داخل خط الأنابيب الذي يحوّل النص الخام إلى حكم موثوق.", fr:"Un aperçu du pipeline qui transforme un texte brut en verdict fiable.", de:"Ein Blick in die Pipeline, die Rohtext in ein zuverlässiges Urteil verwandelt.", zh:"深入了解将原始文本转化为可信裁定的流程。", hi:"उस पाइपलाइन के अंदर एक नज़र जो कच्चे टेक्स्ट को एक विश्वसनीय फैसले में बदलती है।" },

  // ── MEDIA DETECT PAGE ──────────────────────────────────
  media_hero_label:  { en:"AI Vision Analysis", es:"Análisis de Visión IA", ka:"AI ვიზიის ანალიზი", ar:"تحليل الرؤية بالذكاء الاصطناعي", fr:"Analyse Vision IA", de:"KI-Bildanalyse", zh:"AI 视觉分析", hi:"AI दृष्टि विश्लेषण" },
  media_hero_h1a:    { en:"Is this image or video", es:"¿Esta imagen o vídeo es", ka:"ეს სურათი ან ვიდეო", ar:"هل هذه الصورة أو الفيديو", fr:"Cette image ou vidéo est-elle", de:"Ist dieses Bild oder Video", zh:"这张图片或视频是", hi:"क्या यह छवि या वीडियो" },
  media_hero_h1b:    { en:"AI-generated?", es:"generado por IA?", ka:"AI-ით შექმნილია?", ar:"مولّد بالذكاء الاصطناعي؟", fr:"générée par IA ?", de:"KI-generiert?", zh:"AI 生成的？", hi:"AI-जनित है?" },
  media_hero_sub:    { en:"Upload any image or video. TruthGuard analyses metadata, pixel patterns, and uses Gemini Vision to detect synthetic media.", es:"Sube cualquier imagen o vídeo. TruthGuard analiza metadatos, patrones de píxeles y usa Gemini Vision para detectar medios sintéticos.", ka:"ატვირთეთ ნებისმიერი სურათი ან ვიდეო. TruthGuard აანალიზებს მეტამონაცემებს, პიქსელის პატერნებს და იყენებს Gemini Vision-ს სინთეტიკური მედიის გამოსავლენად.", ar:"قم بتحميل أي صورة أو فيديو. يحلل TruthGuard البيانات الوصفية وأنماط البكسل ويستخدم Gemini Vision لاكتشاف الوسائط الاصطناعية.", fr:"Téléchargez n'importe quelle image ou vidéo. TruthGuard analyse les métadonnées, les motifs de pixels et utilise Gemini Vision pour détecter les médias synthétiques.", de:"Laden Sie ein Bild oder Video hoch. TruthGuard analysiert Metadaten, Pixelmuster und nutzt Gemini Vision zur Erkennung synthetischer Medien.", zh:"上传任何图片或视频。TruthGuard 分析元数据、像素模式，并使用 Gemini Vision 检测合成媒体。", hi:"कोई भी छवि या वीडियो अपलोड करें। TruthGuard मेटाडेटा, पिक्सेल पैटर्न का विश्लेषण करता है और सिंथेटिक मीडिया का पता लगाने के लिए Gemini Vision का उपयोग करता है।" },
  media_upload_tag:  { en:"Media Upload", es:"Subida de Medios", ka:"მედიის ატვირთვა", ar:"تحميل الوسائط", fr:"Chargement Média", de:"Medien-Upload", zh:"媒体上传", hi:"मीडिया अपलोड" },
  media_img_mode:    { en:"🖼 Image", es:"🖼 Imagen", ka:"🖼 სურათი", ar:"🖼 صورة", fr:"🖼 Image", de:"🖼 Bild", zh:"🖼 图片", hi:"🖼 छवि" },
  media_vid_mode:    { en:"🎬 Video", es:"🎬 Vídeo", ka:"🎬 ვიდეო", ar:"🎬 فيديو", fr:"🎬 Vidéo", de:"🎬 Video", zh:"🎬 视频", hi:"🎬 वीडियो" },
  media_drop_strong: { en:"Drop your file here, or click to browse", es:"Suelta tu archivo aquí, o haz clic para explorar", ka:"ჩააგდეთ თქვენი ფაილი აქ, ან დააჭირეთ დასათვალიერებლად", ar:"أسقط ملفك هنا، أو انقر للاستعراض", fr:"Déposez votre fichier ici, ou cliquez pour parcourir", de:"Datei hier ablegen oder klicken zum Durchsuchen", zh:"将文件拖放到此处，或点击浏览", hi:"अपनी फ़ाइल यहाँ छोड़ें, या ब्राउज़ करने के लिए क्लिक करें" },
  media_drop_img:    { en:"JPG, PNG, WebP, GIF — max 50 MB", es:"JPG, PNG, WebP, GIF — máx. 50 MB", ka:"JPG, PNG, WebP, GIF — მაქს. 50 MB", ar:"JPG, PNG, WebP, GIF — الحد الأقصى 50 ميجابايت", fr:"JPG, PNG, WebP, GIF — max 50 Mo", de:"JPG, PNG, WebP, GIF — max. 50 MB", zh:"JPG、PNG、WebP、GIF — 最大 50 MB", hi:"JPG, PNG, WebP, GIF — अधिकतम 50 MB" },
  media_drop_vid:    { en:"MP4, MOV, WebM, AVI, MKV — max 50 MB", es:"MP4, MOV, WebM, AVI, MKV — máx. 50 MB", ka:"MP4, MOV, WebM, AVI, MKV — მაქს. 50 MB", ar:"MP4, MOV, WebM, AVI, MKV — الحد الأقصى 50 ميجابايت", fr:"MP4, MOV, WebM, AVI, MKV — max 50 Mo", de:"MP4, MOV, WebM, AVI, MKV — max. 50 MB", zh:"MP4、MOV、WebM、AVI、MKV — 最大 50 MB", hi:"MP4, MOV, WebM, AVI, MKV — अधिकतम 50 MB" },
  btn_analyse_media: { en:"Analyse Media", es:"Analizar Medios", ka:"მედიის ანალიზი", ar:"تحليل الوسائط", fr:"Analyser le média", de:"Medien analysieren", zh:"分析媒体", hi:"मीडिया विश्लेषण करें" },
  btn_analysing_m:   { en:"Analysing", es:"Analizando", ka:"მიმდინარეობს ანალიზი", ar:"جارٍ التحليل", fr:"Analyse en cours", de:"Analysiere…", zh:"正在分析", hi:"विश्लेषण हो रहा है" },

  media_hiw_label:   { en:"How media detection works", es:"Cómo funciona la detección de medios", ka:"როგორ მუშაობს მედია-დეტექცია", ar:"كيف يعمل اكتشاف الوسائط", fr:"Comment fonctionne la détection de médias", de:"Wie die Medienerkennung funktioniert", zh:"媒体检测如何工作", hi:"मीडिया डिटेक्शन कैसे काम करता है" },
  media_h01:         { en:"Metadata Inspection", es:"Inspección de Metadatos", ka:"მეტამონაცემების შემოწმება", ar:"فحص البيانات الوصفية", fr:"Inspection des métadonnées", de:"Metadaten-Inspektion", zh:"元数据检查", hi:"मेटाडेटा निरीक्षण" },
  media_p01:         { en:"EXIF data, software tags, PNG chunks, and resolution patterns are scanned for AI-generator fingerprints.", es:"Los datos EXIF, etiquetas de software, fragmentos PNG y patrones de resolución se escanean en busca de huellas de generadores de IA.", ka:"EXIF მონაცემები, პროგრამული ტეგები, PNG ჩანართები და გარჩევადობის პატერნები სკანირდება AI გენერატორების თითის ანაბეჭდებისთვის.", ar:"يتم فحص بيانات EXIF وعلامات البرامج ومقاطع PNG وأنماط الدقة بحثاً عن بصمات مولدات الذكاء الاصطناعي.", fr:"Les données EXIF, les balises logicielles, les chunks PNG et les patterns de résolution sont scannés pour détecter les empreintes des générateurs IA.", de:"EXIF-Daten, Software-Tags, PNG-Chunks und Auflösungsmuster werden nach KI-Generator-Fingerabdrücken durchsucht.", zh:"扫描 EXIF 数据、软件标签、PNG 块和分辨率模式，寻找 AI 生成器的指纹。", hi:"EXIF डेटा, सॉफ्टवेयर टैग, PNG चंक और रिज़ॉल्यूशन पैटर्न को AI जनरेटर फिंगरप्रिंट के लिए स्कैन किया जाता है।" },
  media_h02:         { en:"Pixel Analysis", es:"Análisis de Píxeles", ka:"პიქსელის ანალიზი", ar:"تحليل البكسل", fr:"Analyse des pixels", de:"Pixelanalyse", zh:"像素分析", hi:"पिक्सेल विश्लेषण" },
  media_p02:         { en:"Error Level Analysis (ELA) and texture variance checks flag unnaturally smooth or uniform regions typical of diffusion models.", es:"El Análisis de Nivel de Error (ELA) y las comprobaciones de varianza de textura señalan regiones artificialmente suaves o uniformes.", ka:"შეცდომის დონის ანალიზი (ELA) და ტექსტურის ვარიანტობის შემოწმება მონიშნავს არაბუნებრივად გლუვ ან ერთგვაროვან რეგიონებს.", ar:"يُحدد تحليل مستوى الخطأ (ELA) وفحوصات تباين النسيج المناطق الناعمة أو الموحدة بشكل غير طبيعي.", fr:"L'analyse du niveau d'erreur (ELA) et les vérifications de variance de texture signalent les régions anormalement lisses ou uniformes.", de:"Error Level Analysis (ELA) und Texturvarianz-Prüfungen markieren unnatürlich glatte oder einheitliche Bereiche.", zh:"误差级别分析（ELA）和纹理方差检查标记扩散模型典型的异常平滑或均匀区域。", hi:"एरर लेवल एनालिसिस (ELA) और टेक्सचर वेरियन्स चेक डिफ्यूजन मॉडल के विशिष्ट अप्राकृतिक रूप से चिकने या एकसमान क्षेत्रों को फ्लैग करते हैं।" },
  media_h03:         { en:"Gemini Vision", es:"Gemini Vision", ka:"Gemini Vision", ar:"Gemini Vision", fr:"Gemini Vision", de:"Gemini Vision", zh:"Gemini Vision", hi:"Gemini Vision" },
  media_p03:         { en:"Google's multimodal AI analyses visual anomalies — garbled text, impossible geometry, skin artifacts, deepfake boundaries.", es:"La IA multimodal de Google analiza anomalías visuales: texto ilegible, geometría imposible, artefactos de piel, límites de deepfake.", ka:"Google-ის მულტიმოდალური AI აანალიზებს ვიზუალურ ანომალიებს — დარღვეულ ტექსტს, შეუძლებელ გეომეტრიას, კანის არტეფაქტებს.", ar:"يحلل الذكاء الاصطناعي متعدد الوسائط من Google الشذوذات البصرية — النص المشوه والهندسة المستحيلة وعيوب الجلد.", fr:"L'IA multimodale de Google analyse les anomalies visuelles — texte brouillé, géométrie impossible, artefacts cutanés, frontières deepfake.", de:"Googles multimodales KI analysiert visuelle Anomalien — kryptischen Text, unmögliche Geometrie, Haufartefakte, Deepfake-Grenzen.", zh:"谷歌的多模态 AI 分析视觉异常——乱码文本、不可能的几何形状、皮肤瑕疵、深度伪造边界。", hi:"Google का मल्टीमॉडल AI दृश्य विसंगतियों का विश्लेषण करता है — गड़बड़ाया हुआ टेक्स्ट, असंभव ज्यामिति, त्वचा कलाकृतियां, डीपफेक सीमाएं।" },
  media_h04:         { en:"Frame Sampling (Video)", es:"Muestreo de Fotogramas (Vídeo)", ka:"ფრეიმების შერჩევა (ვიდეო)", ar:"أخذ عينات الإطارات (الفيديو)", fr:"Échantillonnage de frames (Vidéo)", de:"Frame-Sampling (Video)", zh:"帧采样（视频）", hi:"फ्रेम सैंपलिंग (वीडियो)" },
  media_p04:         { en:"Six evenly-spaced frames are extracted and analysed individually. Aggregate AI score is averaged across all frames.", es:"Se extraen y analizan individualmente seis fotogramas a intervalos regulares. La puntuación de IA agregada se promedia en todos los fotogramas.", ka:"ექვსი თანაბრად განაწილებული კადრი ამოიღება და ინდივიდუალურად გაანალიზდება. AI-ის საერთო ქულა საშუალოა ყველა კადრში.", ar:"يتم استخراج ستة إطارات متباعدة بالتساوي وتحليلها بشكل فردي. يتم حساب متوسط درجة الذكاء الاصطناعي الإجمالية عبر جميع الإطارات.", fr:"Six frames équidistantes sont extraites et analysées individuellement. Le score IA global est calculé en moyenne sur tous les frames.", de:"Sechs gleichmäßig verteilte Frames werden extrahiert und einzeln analysiert. Der KI-Gesamtscore wird über alle Frames gemittelt.", zh:"提取六个均匀分布的帧并单独分析。所有帧的综合 AI 分数取平均值。", hi:"छह समान रूप से वितरित फ्रेम निकाले जाते हैं और अलग-अलग विश्लेषण किए जाते हैं। सभी फ्रेम में औसत AI स्कोर की गणना की जाती है।" },

  disclaimer_text: { en:"<strong>Important:</strong> AI media detection is an evolving science. Results should be treated as one signal among many — not definitive proof. High-quality AI images can fool detectors; heavily compressed real photos may trigger false positives. Always cross-reference with contextual research and reverse image search.", es:"<strong>Importante:</strong> La detección de medios con IA es una ciencia en evolución. Los resultados deben tratarse como una señal entre muchas, no como prueba definitiva.", ka:"<strong>მნიშვნელოვანია:</strong> AI მედიის გამოვლენა არის განვითარებადი მეცნიერება. შედეგები უნდა განიხილებოდეს, როგორც ერთ-ერთი სიგნალი მრავალ სხვასთან ერთად.", ar:"<strong>مهم:</strong> كشف الوسائط بالذكاء الاصطناعي علم في طور التطور. يجب التعامل مع النتائج باعتبارها إشارة واحدة من بين كثيرة — وليست دليلاً قاطعاً.", fr:"<strong>Important :</strong> La détection de médias IA est une science en évolution. Les résultats doivent être traités comme un signal parmi d'autres — pas une preuve définitive.", de:"<strong>Wichtig:</strong> KI-Medienerkennung ist eine sich entwickelnde Wissenschaft. Ergebnisse sollten als eines von vielen Signalen behandelt werden — kein definitiver Beweis.", zh:"<strong>重要：</strong>AI 媒体检测是一门不断发展的科学。结果应视为众多信号之一——而非确凿证据。", hi:"<strong>महत्वपूर्ण:</strong> AI मीडिया पहचान एक विकसित हो रहा विज्ञान है। परिणामों को कई संकेतों में से एक के रूप में माना जाना चाहिए — निश्चित प्रमाण के रूप में नहीं।" },
};

// ═══════════════════════════════════════════════════════════
// LANGUAGE SWITCHER UI
// ═══════════════════════════════════════════════════════════

const STORAGE_KEY = "truthlens_lang";

function getCurrentLang() {
  return localStorage.getItem(STORAGE_KEY) || "en";
}

function setLang(lang) {
  localStorage.setItem(STORAGE_KEY, lang);
  applyTranslations(lang);
  updateSwitcherUI(lang);
  applyDir(lang);
}

function applyDir(lang) {
  const dir = LANGUAGES[lang]?.dir || "ltr";
  document.documentElement.setAttribute("dir", dir);
  document.documentElement.setAttribute("lang", lang);
}

function t(key, lang) {
  const map = TRANSLATIONS[key];
  if (!map) return key;
  return map[lang] || map["en"] || key;
}

function applyTranslations(lang) {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    const translation = t(key, lang);
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
      el.placeholder = translation;
    } else if (el.hasAttribute("data-i18n-html")) {
      el.innerHTML = translation;
    } else {
      el.textContent = translation;
    }
  });
}

function updateSwitcherUI(lang) {
  // Update all lang buttons
  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });
  // Update trigger label
  const trigger = document.querySelector(".lang-trigger");
  if (trigger) {
    trigger.textContent = (LANGUAGES[lang]?.flag || "") + " " + (LANGUAGES[lang]?.label || lang);
  }
}

// ─── Build the switcher HTML and inject into header ────────
function injectLangSwitcher() {
  const nav = document.querySelector("header nav");
  if (!nav) return;

  const wrapper = document.createElement("div");
  wrapper.className = "lang-switcher";

  const trigger = document.createElement("button");
  trigger.className = "lang-trigger";
  trigger.setAttribute("aria-label", "Select language");

  const dropdown = document.createElement("div");
  dropdown.className = "lang-dropdown";

  Object.entries(LANGUAGES).forEach(([code, info]) => {
    const btn = document.createElement("button");
    btn.className = "lang-btn";
    btn.dataset.lang = code;
    btn.innerHTML = `<span class="lang-flag">${info.flag}</span><span class="lang-name">${info.label}</span>`;
    btn.addEventListener("click", () => {
      setLang(code);
      dropdown.classList.remove("open");
    });
    dropdown.appendChild(btn);
  });

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("open");
  });

  document.addEventListener("click", () => dropdown.classList.remove("open"));

  wrapper.appendChild(trigger);
  wrapper.appendChild(dropdown);
  nav.appendChild(wrapper);
}

// ─── Inject CSS for switcher ───────────────────────────────
function injectSwitcherStyles() {
  const style = document.createElement("style");
  style.textContent = `
    /* ── Language Switcher ── */
    .lang-switcher {
      position: relative;
      margin-left: 0.5rem;
    }
    .lang-trigger {
      font-family: 'DM Mono', monospace;
      font-size: 0.72rem;
      padding: 0.35rem 0.75rem;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.04);
      color: rgba(255,255,255,0.65);
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s;
      letter-spacing: 0.03em;
    }
    .lang-trigger:hover {
      border-color: rgba(167,139,250,0.4);
      background: rgba(167,139,250,0.08);
      color: #a78bfa;
    }
    .lang-dropdown {
      display: none;
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      background: #0f0f13;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 0.4rem;
      min-width: 170px;
      z-index: 999;
      box-shadow: 0 16px 48px rgba(0,0,0,0.6);
      animation: dropIn 0.15s ease;
    }
    .lang-dropdown.open { display: block; }
    @keyframes dropIn {
      from { opacity: 0; transform: translateY(-6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .lang-btn {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      width: 100%;
      padding: 0.45rem 0.7rem;
      border: none;
      background: transparent;
      color: rgba(255,255,255,0.55);
      font-family: 'DM Sans', sans-serif;
      font-size: 0.82rem;
      cursor: pointer;
      border-radius: 8px;
      transition: all 0.15s;
      text-align: left;
    }
    .lang-btn:hover {
      background: rgba(167,139,250,0.1);
      color: rgba(255,255,255,0.9);
    }
    .lang-btn.active {
      background: rgba(167,139,250,0.15);
      color: #a78bfa;
      font-weight: 600;
    }
    .lang-flag { font-size: 1rem; }
    .lang-name { flex: 1; }

    /* RTL support */
    [dir="rtl"] header nav { flex-direction: row-reverse; }
    [dir="rtl"] .lang-dropdown { right: auto; left: 0; }
    [dir="rtl"] .lang-btn { flex-direction: row-reverse; text-align: right; }
    [dir="rtl"] .hero-label::before,
    [dir="rtl"] .hero-label::after { display: none; }
  `;
  document.head.appendChild(style);
}

// ─── Init ──────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  injectSwitcherStyles();
  injectLangSwitcher();
  const lang = getCurrentLang();
  applyTranslations(lang);
  updateSwitcherUI(lang);
  applyDir(lang);
});