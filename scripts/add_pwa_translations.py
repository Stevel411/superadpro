#!/usr/bin/env python3
"""Insert pwa.* translations into all 20 SuperAdPro locale files.

Keys: installPromptAria, installTitle, installSubIOS, installSub,
      installBtn, installDismiss

All strings are UI-short. Translations follow SuperAdPro's existing terminology
choices visible in each locale file where relevant (e.g. German uses "du" form
per existing tone, Japanese stays polite-form, etc.)
"""
import json
from pathlib import Path

LOCALES_DIR = Path('frontend/src/i18n/locales')

TRANSLATIONS = {
    'en': {
        'installPromptAria': 'Install SuperAdPro',
        'installTitle': 'Add SuperAdPro to your home screen',
        'installSubIOS': 'Tap Share, then "Add to Home Screen" for one-tap access to your daily quota.',
        'installSub': 'Watch your daily quota in one tap. No browser, no delays.',
        'installBtn': 'Install',
        'installDismiss': 'Dismiss',
    },
    'fr': {
        'installPromptAria': 'Installer SuperAdPro',
        'installTitle': 'Ajoutez SuperAdPro à votre écran d\'accueil',
        'installSubIOS': 'Appuyez sur Partager, puis « Sur l\'écran d\'accueil » pour accéder à votre quota en un geste.',
        'installSub': 'Regardez votre quota quotidien en un geste. Sans navigateur, sans délai.',
        'installBtn': 'Installer',
        'installDismiss': 'Ignorer',
    },
    'de': {
        'installPromptAria': 'SuperAdPro installieren',
        'installTitle': 'SuperAdPro zum Startbildschirm hinzufügen',
        'installSubIOS': 'Tippe auf Teilen und dann „Zum Home-Bildschirm" für Ein-Tipp-Zugriff auf dein Tagesziel.',
        'installSub': 'Erreiche dein Tagesziel mit einem Tipp. Kein Browser, keine Verzögerung.',
        'installBtn': 'Installieren',
        'installDismiss': 'Schließen',
    },
    'es': {
        'installPromptAria': 'Instalar SuperAdPro',
        'installTitle': 'Añade SuperAdPro a tu pantalla de inicio',
        'installSubIOS': 'Toca Compartir y luego «Añadir a pantalla de inicio» para acceder a tu cuota con un solo toque.',
        'installSub': 'Mira tu cuota diaria con un solo toque. Sin navegador, sin demoras.',
        'installBtn': 'Instalar',
        'installDismiss': 'Cerrar',
    },
    'it': {
        'installPromptAria': 'Installa SuperAdPro',
        'installTitle': 'Aggiungi SuperAdPro alla schermata Home',
        'installSubIOS': 'Tocca Condividi, poi «Aggiungi a Home» per accedere alla tua quota con un solo tocco.',
        'installSub': 'Guarda la tua quota giornaliera con un tocco. Nessun browser, nessun ritardo.',
        'installBtn': 'Installa',
        'installDismiss': 'Chiudi',
    },
    'pt': {
        'installPromptAria': 'Instalar SuperAdPro',
        'installTitle': 'Adicione o SuperAdPro à tela inicial',
        'installSubIOS': 'Toque em Compartilhar e depois em "Adicionar à Tela de Início" para acessar sua cota com um toque.',
        'installSub': 'Assista à sua cota diária com um toque. Sem navegador, sem demora.',
        'installBtn': 'Instalar',
        'installDismiss': 'Fechar',
    },
    'nl': {
        'installPromptAria': 'SuperAdPro installeren',
        'installTitle': 'Voeg SuperAdPro toe aan je beginscherm',
        'installSubIOS': 'Tik op Delen en dan "Zet op beginscherm" voor toegang tot je quota met één tik.',
        'installSub': 'Bekijk je dagelijkse quota met één tik. Geen browser, geen vertraging.',
        'installBtn': 'Installeren',
        'installDismiss': 'Sluiten',
    },
    'pl': {
        'installPromptAria': 'Zainstaluj SuperAdPro',
        'installTitle': 'Dodaj SuperAdPro do ekranu głównego',
        'installSubIOS': 'Stuknij Udostępnij, a następnie „Do ekranu początkowego", aby mieć dostęp do dziennego limitu jednym stuknięciem.',
        'installSub': 'Oglądaj swój dzienny limit jednym stuknięciem. Bez przeglądarki, bez opóźnień.',
        'installBtn': 'Zainstaluj',
        'installDismiss': 'Zamknij',
    },
    'tr': {
        'installPromptAria': 'SuperAdPro\'yu yükle',
        'installTitle': 'SuperAdPro\'yu ana ekranınıza ekleyin',
        'installSubIOS': 'Paylaş simgesine ve ardından "Ana Ekrana Ekle" seçeneğine dokunarak günlük kotanıza tek dokunuşla erişin.',
        'installSub': 'Günlük kotanızı tek dokunuşla izleyin. Tarayıcı yok, gecikme yok.',
        'installBtn': 'Yükle',
        'installDismiss': 'Kapat',
    },
    'ru': {
        'installPromptAria': 'Установить SuperAdPro',
        'installTitle': 'Добавьте SuperAdPro на главный экран',
        'installSubIOS': 'Нажмите «Поделиться», затем «На экран "Домой"», чтобы открывать дневную норму одним касанием.',
        'installSub': 'Смотрите дневную норму одним касанием. Без браузера, без задержек.',
        'installBtn': 'Установить',
        'installDismiss': 'Закрыть',
    },
    'ar': {
        'installPromptAria': 'تثبيت SuperAdPro',
        'installTitle': 'أضف SuperAdPro إلى الشاشة الرئيسية',
        'installSubIOS': 'اضغط على مشاركة، ثم "إضافة إلى الشاشة الرئيسية" للوصول إلى حصتك اليومية بضغطة واحدة.',
        'installSub': 'شاهد حصتك اليومية بضغطة واحدة. بدون متصفح، بدون تأخير.',
        'installBtn': 'تثبيت',
        'installDismiss': 'إغلاق',
    },
    'hi': {
        'installPromptAria': 'SuperAdPro इंस्टॉल करें',
        'installTitle': 'SuperAdPro को अपनी होम स्क्रीन पर जोड़ें',
        'installSubIOS': 'शेयर पर टैप करें, फिर "होम स्क्रीन पर जोड़ें" पर टैप करें ताकि अपनी दैनिक क्वोटा एक टैप में देख सकें।',
        'installSub': 'अपनी दैनिक क्वोटा एक टैप में देखें। ब्राउज़र नहीं, देरी नहीं।',
        'installBtn': 'इंस्टॉल करें',
        'installDismiss': 'बंद करें',
    },
    'zh': {
        'installPromptAria': '安装 SuperAdPro',
        'installTitle': '将 SuperAdPro 添加到主屏幕',
        'installSubIOS': '点击"分享",然后点击"添加到主屏幕",一键直达每日任务。',
        'installSub': '一键观看每日任务。无需浏览器,零延迟。',
        'installBtn': '安装',
        'installDismiss': '关闭',
    },
    'ja': {
        'installPromptAria': 'SuperAdProをインストール',
        'installTitle': 'SuperAdProをホーム画面に追加',
        'installSubIOS': '共有をタップし、「ホーム画面に追加」を選んでデイリークオータにワンタップでアクセス。',
        'installSub': 'デイリークオータをワンタップで。ブラウザ不要、待ち時間なし。',
        'installBtn': 'インストール',
        'installDismiss': '閉じる',
    },
    'ko': {
        'installPromptAria': 'SuperAdPro 설치',
        'installTitle': 'SuperAdPro를 홈 화면에 추가하세요',
        'installSubIOS': '공유를 탭한 다음 "홈 화면에 추가"를 선택하면 일일 할당량에 한 번의 탭으로 접근할 수 있습니다.',
        'installSub': '일일 할당량을 한 번의 탭으로 확인하세요. 브라우저 없이, 지연 없이.',
        'installBtn': '설치',
        'installDismiss': '닫기',
    },
    'vi': {
        'installPromptAria': 'Cài đặt SuperAdPro',
        'installTitle': 'Thêm SuperAdPro vào màn hình chính',
        'installSubIOS': 'Nhấn Chia sẻ, rồi chọn "Thêm vào Màn hình chính" để truy cập hạn mức hàng ngày chỉ với một lần chạm.',
        'installSub': 'Xem hạn mức hàng ngày chỉ với một lần chạm. Không trình duyệt, không chậm trễ.',
        'installBtn': 'Cài đặt',
        'installDismiss': 'Đóng',
    },
    'th': {
        'installPromptAria': 'ติดตั้ง SuperAdPro',
        'installTitle': 'เพิ่ม SuperAdPro ลงในหน้าจอหลัก',
        'installSubIOS': 'แตะ แชร์ แล้วเลือก "เพิ่มไปที่หน้าจอโฮม" เพื่อเข้าถึงโควต้ารายวันของคุณในแตะเดียว',
        'installSub': 'ดูโควต้ารายวันของคุณในแตะเดียว ไม่ต้องใช้เบราว์เซอร์ ไม่ล่าช้า',
        'installBtn': 'ติดตั้ง',
        'installDismiss': 'ปิด',
    },
    'id': {
        'installPromptAria': 'Pasang SuperAdPro',
        'installTitle': 'Tambahkan SuperAdPro ke layar utama',
        'installSubIOS': 'Ketuk Bagikan, lalu "Tambahkan ke Layar Utama" untuk akses kuota harian dengan sekali ketuk.',
        'installSub': 'Tonton kuota harianmu dengan sekali ketuk. Tanpa browser, tanpa penundaan.',
        'installBtn': 'Pasang',
        'installDismiss': 'Tutup',
    },
    'tl': {
        'installPromptAria': 'I-install ang SuperAdPro',
        'installTitle': 'Idagdag ang SuperAdPro sa iyong home screen',
        'installSubIOS': 'I-tap ang Share, pagkatapos ay "Add to Home Screen" para sa one-tap na access sa iyong araw-araw na quota.',
        'installSub': 'Panoorin ang iyong araw-araw na quota sa isang tap. Walang browser, walang pagkaantala.',
        'installBtn': 'I-install',
        'installDismiss': 'Isara',
    },
    'sw': {
        'installPromptAria': 'Sakinisha SuperAdPro',
        'installTitle': 'Ongeza SuperAdPro kwenye skrini yako ya mwanzo',
        'installSubIOS': 'Gusa Shiriki, kisha "Ongeza kwenye Skrini ya Mwanzo" ili kufikia kiwango chako cha kila siku kwa mguso mmoja.',
        'installSub': 'Tazama kiwango chako cha kila siku kwa mguso mmoja. Bila kivinjari, bila ucheleweshaji.',
        'installBtn': 'Sakinisha',
        'installDismiss': 'Funga',
    },
}

def main():
    assert len(TRANSLATIONS) == 20, f'Expected 20 languages, got {len(TRANSLATIONS)}'
    written = []
    for lang, translations in TRANSLATIONS.items():
        path = LOCALES_DIR / f'{lang}.json'
        if not path.exists():
            print(f'  SKIP: {lang}.json not found')
            continue
        with path.open('r', encoding='utf-8') as f:
            data = json.load(f)
        # Insert or replace the pwa block
        data['pwa'] = translations
        with path.open('w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write('\n')  # trailing newline, matches existing format
        written.append(lang)
        print(f'  OK:   {lang}.json (6 pwa keys)')
    print(f'\nDone. Updated {len(written)} locale files: {", ".join(written)}')

if __name__ == '__main__':
    main()
