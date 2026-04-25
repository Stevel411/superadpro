#!/usr/bin/env python3
"""
Seed Layer 3 translation keys for the re-engagement notification
plus the sponsor-facing nudge UI on the BucketList page.

Adds two key groups:

1. notification.reengagement_lapsed_title
   notification.reengagement_lapsed_message
   These are the strings the LAPSED member sees in their notification
   bell. Frontend looks them up using the translation_key column.

2. commandCentre.nudgeButton          — "Send re-engagement reminder"
   commandCentre.nudgeButtonSent      — "Reminder sent"
   commandCentre.nudgeButtonPending   — "They already have an unread reminder"
   commandCentre.nudgeButtonError     — "Could not send"
   These are sponsor-facing labels on the Lapsed bucket row's expanded
   panel, so the sponsor's UI translates to their own language.

Idempotent — skips keys that already exist.
"""
import json
from pathlib import Path

LOCALES_DIR = Path(__file__).parent.parent / 'frontend/src/i18n/locales'

# Per-language strings.
TRANSLATIONS = {
    'en': {
        'notification': {
            'reengagement_lapsed_title': 'Your SuperAdPro membership lapsed',
            'reengagement_lapsed_message': 'Your network and earnings are still here waiting for you. Click below to reactivate.',
        },
        'commandCentre': {
            'nudgeButton': 'Send re-engagement reminder',
            'nudgeButtonSent': 'Reminder sent',
            'nudgeButtonPending': 'They already have an unread reminder',
            'nudgeButtonError': 'Could not send',
        },
    },
    'es': {
        'notification': {
            'reengagement_lapsed_title': 'Tu membresía SuperAdPro caducó',
            'reengagement_lapsed_message': 'Tu red y tus ganancias siguen aquí esperándote. Haz clic abajo para reactivar.',
        },
        'commandCentre': {
            'nudgeButton': 'Enviar recordatorio de reactivación',
            'nudgeButtonSent': 'Recordatorio enviado',
            'nudgeButtonPending': 'Ya tienen un recordatorio sin leer',
            'nudgeButtonError': 'No se pudo enviar',
        },
    },
    'fr': {
        'notification': {
            'reengagement_lapsed_title': 'Votre abonnement SuperAdPro a expiré',
            'reengagement_lapsed_message': "Votre réseau et vos revenus vous attendent. Cliquez ci-dessous pour réactiver.",
        },
        'commandCentre': {
            'nudgeButton': 'Envoyer un rappel de réactivation',
            'nudgeButtonSent': 'Rappel envoyé',
            'nudgeButtonPending': 'Ils ont déjà un rappel non lu',
            'nudgeButtonError': "Impossible d'envoyer",
        },
    },
    'de': {
        'notification': {
            'reengagement_lapsed_title': 'Ihre SuperAdPro Mitgliedschaft ist abgelaufen',
            'reengagement_lapsed_message': 'Ihr Netzwerk und Ihre Einnahmen warten noch auf Sie. Klicken Sie unten, um zu reaktivieren.',
        },
        'commandCentre': {
            'nudgeButton': 'Reaktivierungs-Erinnerung senden',
            'nudgeButtonSent': 'Erinnerung gesendet',
            'nudgeButtonPending': 'Sie haben bereits eine ungelesene Erinnerung',
            'nudgeButtonError': 'Konnte nicht gesendet werden',
        },
    },
    'pt': {
        'notification': {
            'reengagement_lapsed_title': 'Sua assinatura SuperAdPro expirou',
            'reengagement_lapsed_message': 'Sua rede e seus ganhos ainda estão aqui esperando por você. Clique abaixo para reativar.',
        },
        'commandCentre': {
            'nudgeButton': 'Enviar lembrete de reativação',
            'nudgeButtonSent': 'Lembrete enviado',
            'nudgeButtonPending': 'Eles já têm um lembrete não lido',
            'nudgeButtonError': 'Não foi possível enviar',
        },
    },
    'it': {
        'notification': {
            'reengagement_lapsed_title': 'La tua iscrizione SuperAdPro è scaduta',
            'reengagement_lapsed_message': 'La tua rete e i tuoi guadagni ti stanno ancora aspettando. Clicca qui sotto per riattivare.',
        },
        'commandCentre': {
            'nudgeButton': 'Invia promemoria di riattivazione',
            'nudgeButtonSent': 'Promemoria inviato',
            'nudgeButtonPending': 'Hanno già un promemoria non letto',
            'nudgeButtonError': 'Impossibile inviare',
        },
    },
    'nl': {
        'notification': {
            'reengagement_lapsed_title': 'Je SuperAdPro-lidmaatschap is verlopen',
            'reengagement_lapsed_message': 'Je netwerk en inkomsten staan nog op je te wachten. Klik hieronder om te reactiveren.',
        },
        'commandCentre': {
            'nudgeButton': 'Heractiveringsherinnering sturen',
            'nudgeButtonSent': 'Herinnering verzonden',
            'nudgeButtonPending': 'Ze hebben al een ongelezen herinnering',
            'nudgeButtonError': 'Kon niet verzenden',
        },
    },
    'pl': {
        'notification': {
            'reengagement_lapsed_title': 'Twoje członkostwo SuperAdPro wygasło',
            'reengagement_lapsed_message': 'Twoja sieć i zarobki nadal na Ciebie czekają. Kliknij poniżej, aby reaktywować.',
        },
        'commandCentre': {
            'nudgeButton': 'Wyślij przypomnienie o reaktywacji',
            'nudgeButtonSent': 'Przypomnienie wysłane',
            'nudgeButtonPending': 'Mają już nieprzeczytane przypomnienie',
            'nudgeButtonError': 'Nie udało się wysłać',
        },
    },
    'tr': {
        'notification': {
            'reengagement_lapsed_title': 'SuperAdPro üyeliğiniz sona erdi',
            'reengagement_lapsed_message': 'Ağınız ve kazançlarınız hâlâ sizi bekliyor. Yeniden etkinleştirmek için aşağıya tıklayın.',
        },
        'commandCentre': {
            'nudgeButton': 'Yeniden etkinleştirme hatırlatması gönder',
            'nudgeButtonSent': 'Hatırlatma gönderildi',
            'nudgeButtonPending': 'Zaten okunmamış bir hatırlatmaları var',
            'nudgeButtonError': 'Gönderilemedi',
        },
    },
    'ru': {
        'notification': {
            'reengagement_lapsed_title': 'Ваше членство SuperAdPro истекло',
            'reengagement_lapsed_message': 'Ваша сеть и доходы по-прежнему ждут вас. Нажмите ниже, чтобы возобновить.',
        },
        'commandCentre': {
            'nudgeButton': 'Отправить напоминание о возобновлении',
            'nudgeButtonSent': 'Напоминание отправлено',
            'nudgeButtonPending': 'У них уже есть непрочитанное напоминание',
            'nudgeButtonError': 'Не удалось отправить',
        },
    },
    'ar': {
        'notification': {
            'reengagement_lapsed_title': 'انتهت عضويتك في SuperAdPro',
            'reengagement_lapsed_message': 'شبكتك وأرباحك لا تزال هنا في انتظارك. اضغط أدناه للتفعيل من جديد.',
        },
        'commandCentre': {
            'nudgeButton': 'إرسال تذكير التفعيل',
            'nudgeButtonSent': 'تم إرسال التذكير',
            'nudgeButtonPending': 'لديهم بالفعل تذكير غير مقروء',
            'nudgeButtonError': 'تعذّر الإرسال',
        },
    },
    'hi': {
        'notification': {
            'reengagement_lapsed_title': 'आपकी SuperAdPro सदस्यता समाप्त हो गई है',
            'reengagement_lapsed_message': 'आपका नेटवर्क और कमाई अभी भी आपका इंतज़ार कर रहे हैं। पुनः सक्रिय करने के लिए नीचे क्लिक करें।',
        },
        'commandCentre': {
            'nudgeButton': 'पुनः सक्रियण अनुस्मारक भेजें',
            'nudgeButtonSent': 'अनुस्मारक भेजा गया',
            'nudgeButtonPending': 'उनके पास पहले से एक अपठित अनुस्मारक है',
            'nudgeButtonError': 'भेज नहीं सका',
        },
    },
    'zh': {
        'notification': {
            'reengagement_lapsed_title': '您的 SuperAdPro 会员已过期',
            'reengagement_lapsed_message': '您的网络和收益仍在等您。点击下方重新激活。',
        },
        'commandCentre': {
            'nudgeButton': '发送重新激活提醒',
            'nudgeButtonSent': '提醒已发送',
            'nudgeButtonPending': '他们已经有一条未读提醒',
            'nudgeButtonError': '无法发送',
        },
    },
    'ja': {
        'notification': {
            'reengagement_lapsed_title': 'あなたの SuperAdPro メンバーシップが失効しました',
            'reengagement_lapsed_message': 'あなたのネットワークと収益はまだここで待っています。下をクリックして再アクティブ化してください。',
        },
        'commandCentre': {
            'nudgeButton': '再アクティブ化リマインダーを送信',
            'nudgeButtonSent': 'リマインダーを送信しました',
            'nudgeButtonPending': 'すでに未読のリマインダーがあります',
            'nudgeButtonError': '送信できませんでした',
        },
    },
    'ko': {
        'notification': {
            'reengagement_lapsed_title': 'SuperAdPro 멤버십이 만료되었습니다',
            'reengagement_lapsed_message': '네트워크와 수익이 아직 기다리고 있습니다. 아래를 클릭하여 다시 활성화하세요.',
        },
        'commandCentre': {
            'nudgeButton': '재활성화 알림 보내기',
            'nudgeButtonSent': '알림이 전송됨',
            'nudgeButtonPending': '이미 읽지 않은 알림이 있습니다',
            'nudgeButtonError': '전송할 수 없습니다',
        },
    },
    'vi': {
        'notification': {
            'reengagement_lapsed_title': 'Tư cách thành viên SuperAdPro của bạn đã hết hạn',
            'reengagement_lapsed_message': 'Mạng lưới và thu nhập của bạn vẫn đang chờ. Nhấp bên dưới để kích hoạt lại.',
        },
        'commandCentre': {
            'nudgeButton': 'Gửi nhắc nhở kích hoạt lại',
            'nudgeButtonSent': 'Đã gửi nhắc nhở',
            'nudgeButtonPending': 'Họ đã có một nhắc nhở chưa đọc',
            'nudgeButtonError': 'Không thể gửi',
        },
    },
    'th': {
        'notification': {
            'reengagement_lapsed_title': 'การเป็นสมาชิก SuperAdPro ของคุณหมดอายุ',
            'reengagement_lapsed_message': 'เครือข่ายและรายได้ของคุณยังรออยู่ คลิกด้านล่างเพื่อเปิดใช้งานอีกครั้ง',
        },
        'commandCentre': {
            'nudgeButton': 'ส่งการแจ้งเตือนการเปิดใช้งานใหม่',
            'nudgeButtonSent': 'ส่งการแจ้งเตือนแล้ว',
            'nudgeButtonPending': 'พวกเขามีการแจ้งเตือนที่ยังไม่ได้อ่านอยู่แล้ว',
            'nudgeButtonError': 'ไม่สามารถส่งได้',
        },
    },
    'id': {
        'notification': {
            'reengagement_lapsed_title': 'Keanggotaan SuperAdPro Anda telah berakhir',
            'reengagement_lapsed_message': 'Jaringan dan penghasilan Anda masih menunggu. Klik di bawah untuk mengaktifkan kembali.',
        },
        'commandCentre': {
            'nudgeButton': 'Kirim pengingat reaktivasi',
            'nudgeButtonSent': 'Pengingat terkirim',
            'nudgeButtonPending': 'Mereka sudah memiliki pengingat yang belum dibaca',
            'nudgeButtonError': 'Tidak dapat mengirim',
        },
    },
    'tl': {
        'notification': {
            'reengagement_lapsed_title': 'Nag-expire na ang iyong SuperAdPro membership',
            'reengagement_lapsed_message': 'Ang iyong network at kita ay nakaabang pa rin para sa iyo. I-click sa ibaba upang i-reactivate.',
        },
        'commandCentre': {
            'nudgeButton': 'Magpadala ng paalala sa reactivation',
            'nudgeButtonSent': 'Naipadala ang paalala',
            'nudgeButtonPending': 'May hindi pa nababasang paalala sila',
            'nudgeButtonError': 'Hindi maipadala',
        },
    },
    'sw': {
        'notification': {
            'reengagement_lapsed_title': 'Uanachama wako wa SuperAdPro umemalizika',
            'reengagement_lapsed_message': 'Mtandao wako na mapato yako bado yanakusubiri. Bofya hapa chini ili kuwasha tena.',
        },
        'commandCentre': {
            'nudgeButton': 'Tuma kikumbusho cha kuwasha tena',
            'nudgeButtonSent': 'Kikumbusho kimetumwa',
            'nudgeButtonPending': 'Tayari wana kikumbusho ambacho hakijasomwa',
            'nudgeButtonError': 'Imeshindwa kutuma',
        },
    },
}

added_total = 0
for lang, ns_to_keys in TRANSLATIONS.items():
    path = LOCALES_DIR / f'{lang}.json'
    if not path.exists():
        print(f'! {lang}.json missing, skipping')
        continue
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    added_for_lang = 0
    for ns, new_keys in ns_to_keys.items():
        if ns not in data:
            data[ns] = {}
        for key, value in new_keys.items():
            if key not in data[ns]:
                data[ns][key] = value
                added_for_lang += 1
    if added_for_lang > 0:
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write('\n')
        print(f'✓ {lang}.json — added {added_for_lang} keys')
        added_total += added_for_lang
    else:
        print(f'  {lang}.json — already up to date')

print(f'\nDone. Added {added_total} translations across {len(TRANSLATIONS)} locales.')
