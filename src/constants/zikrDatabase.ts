import type { ZikrDbEntry, ChecklistItem } from '@app-types';

// ============================================================
// ZIKR DATABASE - Prayer and Dhikr Content
// ============================================================

export const ZIKR_DB = {
  fatiha: {
    tr: { 
      t: "Elhamdülillahi Rabbilalemin. Errahmanirrahim. Maliki yevmiddin. İyyake na'budu ve iyyake neste'in. İhdinessıratal mustekim. Sıratallezine en'amte aleyhim. Ğayrilmağdubi aleyhim veladdalin.", 
      m: "Hamd, Alemlerin Rabbi, Rahman, Rahim, din gününün sahibi Allah'a mahsustur. Ancak sana kulluk eder ve ancak senden yardım dileriz. Bizi doğru yola ilet. Kendilerine nimet verdiklerinin yoluna, gazaba uğramışların ve sapmışların yoluna değil." 
    },
    en: { 
      t: "Alhamdulillahi Rabbil 'Alamin. Ar-Rahmanir Rahim. Maliki Yawmiddin. Iyyaka Na'budu wa Iyyaka Nasta'in. Ihdinas Siratal Mustaqim. Siratal Ladhina An'amta 'Alayhim. Ghayril Maghdubi 'Alayhim Walad Dallin.", 
      m: "All praise is due to Allah, Lord of the worlds, The Entirely Merciful, The Especially Merciful, Master of the Day of Judgment. You alone we worship and You alone we ask for help. Guide us to the straight path. The path of those upon whom You have bestowed favor, not of those who have evoked [Your] anger or of those who are astray." 
    },
    de: { 
      t: "Alhamdulillahi Rabbil 'Alamin. Ar-Rahmanir Rahim. Maliki Yawmiddin. Iyyaka Na'budu wa Iyyaka Nasta'in.", 
      m: "Alles Lob gebührt Allah, dem Herrn der Welten, dem Allerbarmer, dem Barmherzigen, dem Herrn des Gerichtstages. Dir allein dienen wir und Dich allein bitten wir um Hilfe." 
    }
  } as ZikrDbEntry,
  
  estag: {
    tr: { 
      t: "Estağfirullah el azim ve etûbü ileyh", 
      m: "Azim olan Allah'tan bağışlanma dilerim ve O'na tövbe ederim." 
    },
    en: { 
      t: "Astaghfirullah al-azim wa atubu ilayh", 
      m: "I seek forgiveness from Allah, the Magnificent, and I repent to Him." 
    },
    de: { 
      t: "Astaghfirullah al-azim wa atubu ilayh", 
      m: "Ich bitte Allah, den Allmächtigen, um Vergebung und bereue Ihm gegenüber." 
    }
  } as ZikrDbEntry,
  
  salavatM: {
    tr: { 
      t: "Allahümme salli alâ seyyidinâ Muhammedin ve alâ âli seyyidinâ Muhammed", 
      m: "Allah'ım! Efendimiz Muhammed'e ve Efendimiz Muhammed'in ailesine salat eyle." 
    },
    en: { 
      t: "Allahumma salli ala sayyidina Muhammadin wa ala ali sayyidina Muhammad", 
      m: "O Allah, send prayers upon our Master Muhammad and upon the family of our Master Muhammad." 
    },
    de: { 
      t: "Allahumma salli ala sayyidina Muhammadin wa ala ali sayyidina Muhammad", 
      m: "O Allah, segne unseren Meister Muhammad und die Familie unseres Meisters Muhammad." 
    }
  } as ZikrDbEntry,
  
  salavatA: {
    tr: { 
      t: "Allâhümme salli alâ seyyidinâ Âdem", 
      m: "Allah'ım! Efendimiz Adem'e salat eyle." 
    },
    en: { 
      t: "Allahumma salli ala sayyidina Adam", 
      m: "O Allah, send prayers upon our Master Adam." 
    },
    de: { 
      t: "Allahumma salli ala sayyidina Adam", 
      m: "O Allah, segne unseren Meister Adam." 
    }
  } as ZikrDbEntry,
  
  salavatI: {
    tr: { 
      t: "Allâhümme salli alâ seyyidinâ İsâ", 
      m: "Allah'ım! Efendimiz İsa'ya salat eyle." 
    },
    en: { 
      t: "Allahumma salli ala sayyidina Isa", 
      m: "O Allah, send prayers upon our Master Jesus." 
    },
    de: { 
      t: "Allahumma salli ala sayyidina Isa", 
      m: "O Allah, segne unseren Meister Jesus." 
    }
  } as ZikrDbEntry,
  
  salavatB: {
    tr: { 
      t: "Allâhumme salli alâ seyyidinâ Muhammedin ve alâ âli seyyidinâ Muhammed ve alâ ashâbi'l-Kehfi ve ashâbi'r-Rakîmi ve ashâbi Bedrin ve melaiketi Bedri, sallallâhu teâlâ aleyhi ve sellem.", 
      m: "Allah'ım! Efendimiz Muhammed'e, ailesine, Ashab-ı Kehf'e, Rakim sahiplerine, Bedir ashabına ve Bedir meleklerine salat eyle. Allahümme salli ala Muhammed." 
    },
    en: { 
      t: "Allahumma salli ala sayyidina Muhammadin wa ala ali sayyidina Muhammad wa ala ashab il-kahfi wa ashab ir-raqimi wa ashab i-badrin wa malaikati badrin, sallallahu teala aleyhi ve sellem.", 
      m: "O Allah, send prayers upon our Master Muhammad, his family, the Companions of the Cave, the Companions of the Inscription, the Companions of Badr and the Angels of Badr." 
    },
    de: { 
      t: "Allahumma salli ala sayyidina Muhammadin wa ala ali sayyidina Muhammad wa ala ashab il-kahfi wa ashab ir-raqimi wa ashab i-badrin wa malaikati badrin, sallallahu teala aleyhi ve sellem.", 
      m: "O Allah, segne unseren Meister Muhammad, seine Familie, die Gefährten der Höhle, die Leute der Inschrift, die Gefährten von Badr und die Engel von Badr." 
    }
  } as ZikrDbEntry,
  
  kuddus: {
    tr: { 
      t: "El-Kuddüs, El-Kuddüs", 
      m: "Ey her türlü eksiklikten münezzeh olan Allah." 
    },
    en: { 
      t: "Al-Quddus, Al-Quddus", 
      m: "O The Holy, O The Pure One." 
    },
    de: { 
      t: "Al-Quddus, Al-Quddus", 
      m: "O der Heilige, O der Reine." 
    }
  } as ZikrDbEntry,
  
  ek_list: {
    tr: [
      { 
        id: 'kafnun', 
        text: '33 defa "Kaf" "Nun" "Mim" yaz', 
        sub: "Kaf harfi: 20 kez, Nun harfi: 7 kez, Mim harfi: 6 kez yazılır", 
        arabic: "ق ن م" 
      }, 
      { 
        id: 'besmele_full', 
        text: "Besmele zikri (10 dakika)", 
        sub: "Bismillah - Bismirrahman - Bismirrahim - Bismillahirrahman - Bismillahirrahim - Bismirrahmanirrahim - Bismillahirrahmanirrahim",
        arabic: "بسم الله الرحمن الرحيم"
      }
    ] as ChecklistItem[],
    
    en: [
      { 
        id: 'kafnun', 
        text: 'Write "Kaf" "Nun" "Mim" 33 times', 
        sub: "Kaf letter: 20 times, Nun letter: 7 times, Mim letter: 6 times",
        arabic: "ق ن م" 
      }, 
      { 
        id: 'besmele_full', 
        text: "Basmala Dhikr (10 minutes)",
        sub: "Bismillah - Bismirrahman - Bismirrahim - Bismillahirrahman - Bismillahirrahim - Bismirrahmanirrahim - Bismillahirrahmanirrahim",
        arabic: "بسم الله الرحمن الرحيم"
      }
    ] as ChecklistItem[],
    
    de: [
      { 
        id: 'kafnun', 
        text: 'Schreibe "Kaf" "Nun" "Mim" 33 mal', 
        sub: "Kaf Buchstabe: 20 mal, Nun Buchstabe: 7 mal, Mim Buchstabe: 6 mal",
        arabic: "ق ن م" 
      }, 
      { 
        id: 'besmele_full', 
        text: "Basmala Dhikr (10 Minuten)",
        sub: "Bismillah - Bismirrahman - Bismirrahim - Bismillahirrahman - Bismillahirrahim - Bismirrahmanirrahim - Bismillahirrahmanirrahim",
        arabic: "بسم الله الرحمن الرحيم"
      }
    ] as ChecklistItem[]
  }
};

// Special Quran Readings
export const SPECIAL_READINGS = {
  kehf_first_10: { surah: 18, offset: 0, limit: 10, title: { tr: 'Kehf İlk 10', en: 'Kahf First 10', de: 'Kahf Erste 10' } },
  kehf_last_10: { surah: 18, offset: 100, limit: 10, title: { tr: 'Kehf Son 10', en: 'Kahf Last 10', de: 'Kahf Letzte 10' } },
  qaf_first_10: { surah: 50, offset: 0, limit: 10, title: { tr: 'Kaf İlk 10', en: 'Qaf First 10', de: 'Qaf Erste 10' } },
  qaf_last_10: { surah: 50, offset: 35, limit: 10, title: { tr: 'Kaf Son 10', en: 'Qaf Last 10', de: 'Qaf Letzte 10' } },
  amenarresulu: { surah: 2, offset: 284, limit: 2, title: { tr: 'Amenerrasulü', en: 'Amenarrasul', de: 'Amenarrasul' } }
} as const;

// Help Content
export const HELP_CONTENT = {
  tr: [
    {
      title: "1. Ana Ekran: Vakitler",
      content: "Uygulamayı ilk açtığınızda bizi karşılayan ekran burasıdır.<br/><b>Vakit Sayacı:</b> En üstteki yeşil alanda, bir sonraki namaz vaktine ne kadar süre kaldığını görebiliriz.<br/><b>Günün Vakitleri:</b> O günün tüm namaz saatleri liste halinde sıralanır.<br/><b>Özel Vakitler:</b> Listenin altında Teheccüd vakti ve Kerahat vakitleri otomatik hesaplanır."
    },
    {
      title: "2. Tesbihat ve Zikirler",
      content: "Alt menüden <b>Tesbihat</b> ikonuna tıklayarak ulaşabiliriz.<br/><b>Mod Seçimi:</b> Sabah, İkindi, Yatsı, Günlük veya Kişisel modlarından birini seçebiliriz.<br/><b>Zikir Çekme:</b> Büyük daireye her dokunduğumuzda sayaç ilerler. Sayı tamamlanınca otomatik olarak bir sonraki zikre geçer.<br/><b>Kişisel Zikir:</b> Kendi zikirlerimizi ekleyebiliriz."
    },
    {
      title: "3. Kur'an Okuma",
      content: "Alt menüden <b>Kur'an</b> ikonuna tıklayınca açılır.<br/><b>Rastgele Sayfa:</b> Her açışımızda bir Kur'an sayfası getirir.<br/><b>Çevrimdışı:</b> İçerikleri önceden indirerek internet olmadan da okuyabilirsiniz."
    },
    {
      title: "4. Ayarlar",
      content: "<b>Konum:</b> Konumunuzu otomatik veya manuel olarak ayarlayın.<br/><b>Ses ve Titreşim:</b> Zikir çekerken çıkan sesi ve titreşimi ayarlayın.<br/><b>Çevrimdışı İçerik:</b> Namaz vakitleri ve Kur'an sayfalarını önceden indirin."
    },
    {
      title: "İpuçları",
      content: "<b>Uygulama Olarak İndirme:</b> Tarayıcınızdan 'Ana ekrana ekle' seçeneği ile uygulama olarak kullanabilirsiniz.<br/><b>Bildirimler:</b> Vakitlerden önce bildirim almak için izin verin."
    }
  ],
  en: [
    {
      title: "1. Main Screen: Times",
      content: "This is the screen that greets you when you first open the app.<br/><b>Time Counter:</b> In the green area at the top, you can see how much time is left until the next prayer.<br/><b>Prayer Times:</b> All prayer times for the day are listed.<br/><b>Special Times:</b> Tahajjud and Keraha times are automatically calculated."
    },
    {
      title: "2. Dhikr & Tasbeeh",
      content: "Accessible by clicking the <b>Dhikr</b> icon.<br/><b>Mode Selection:</b> Choose from Morning, Asr, Night, Daily, or Personal modes.<br/><b>Counting:</b> Tap the large circle to advance the counter. It automatically moves to the next dhikr when completed.<br/><b>Personal Dhikr:</b> Add your own dhikrs."
    },
    {
      title: "3. Quran Reading",
      content: "Opens by clicking the <b>Quran</b> icon.<br/><b>Random Page:</b> Brings a random Quran page every time.<br/><b>Offline:</b> Download content beforehand to read without internet."
    },
    {
      title: "4. Settings",
      content: "<b>Location:</b> Set your location automatically or manually.<br/><b>Sound & Vibration:</b> Adjust sound and vibration settings.<br/><b>Offline Content:</b> Download prayer times and Quran pages in advance."
    },
    {
      title: "Tips",
      content: "<b>Install as App:</b> Use 'Add to Home Screen' in your browser to use as an app.<br/><b>Notifications:</b> Enable permissions to get alerts before prayer times."
    }
  ],
  de: [
    {
      title: "1. Hauptbildschirm: Zeiten",
      content: "Dies ist der Startbildschirm der App.<br/><b>Zeit-Zähler:</b> Im grünen Bereich oben sehen Sie die verbleibende Zeit bis zum nächsten Gebet.<br/><b>Gebetszeiten:</b> Alle Gebetszeiten des Tages werden aufgelistet.<br/><b>Spezielle Zeiten:</b> Tahajjud und Kerahat Zeiten werden automatisch berechnet."
    },
    {
      title: "2. Dhikr & Tasbih",
      content: "Erreichbar über das <b>Dhikr</b> Symbol.<br/><b>Moduswahl:</b> Wählen Sie zwischen Morgen, Assr, Nacht, Täglich oder Persönlich.<br/><b>Zählen:</b> Tippen Sie auf den großen Kreis. Bei Abschluss geht es automatisch weiter.<br/><b>Persönliches Dhikr:</b> Fügen Sie eigene Dhikrs hinzu."
    },
    {
      title: "3. Koran Lesen",
      content: "Öffnet sich über das <b>Koran</b> Symbol.<br/><b>Zufällige Seite:</b> Zeigt eine zufällige Koranseite.<br/><b>Offline:</b> Laden Sie Inhalte vorher herunter, um ohne Internet zu lesen."
    },
    {
      title: "4. Einstellungen",
      content: "<b>Standort:</b> Korrigieren Sie den Ort automatisch oder manuell.<br/><b>Ton & Vibration:</b> Passen Sie die Einstellungen an.<br/><b>Offline-Inhalte:</b> Laden Sie Gebetszeiten und Koranseiten im Voraus herunter."
    },
    {
      title: "Tipps",
      content: "<b>Als App installieren:</b> Nutzen Sie 'Zum Startbildschirm hinzufügen' in Ihrem Browser.<br/><b>Benachrichtigungen:</b> Aktivieren Sie Berechtigungen für Erinnerungen vor Gebetszeiten."
    }
  ]
};
