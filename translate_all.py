#!/usr/bin/env python3
"""
Generate translations for all 19 languages from EN source.
Processes namespace by namespace with proper phrase-level translations.
"""
import json, os, sys

LOCALE_DIR = 'frontend/src/i18n/locales'

with open(f'{LOCALE_DIR}/en.json') as f:
    en = json.load(f)

LANGS = {
    'es': 'Spanish', 'fr': 'French', 'de': 'German', 'pt': 'Portuguese',
    'ar': 'Arabic', 'hi': 'Hindi', 'zh': 'Chinese', 'ja': 'Japanese', 
    'ko': 'Korean', 'ru': 'Russian', 'it': 'Italian', 'nl': 'Dutch',
    'pl': 'Polish', 'tr': 'Turkish', 'vi': 'Vietnamese', 'th': 'Thai',
    'id': 'Indonesian', 'tl': 'Filipino', 'sw': 'Swahili'
}

# Terms that should NOT be translated (brand names, technical terms)
KEEP_ENGLISH = {
    'Pro', 'SuperAdPro', 'SuperAd', 'USDT', 'USDC', 'Polygon', 'MetaMask',
    'Brevo', 'AI', 'PDF', 'QR', 'URL', 'HTML', 'CSS', 'MP3', 'MP4', 'PNG',
    'SVG', 'NOWPayments', 'SuperLink', 'SuperScene', 'SuperPages', 'SuperLeads',
    'SuperDeck', 'SuperMarket', 'SuperCut', 'LinkHub', 'AdBoost', 'EvoLink',
    'YouTube', 'Vimeo', 'Loom', 'Cloudflare', 'Google Authenticator', 'Google Play',
    'App Store', 'Aa', '0x...', 'USDT / USDC', 'steve@superadpro.com',
    'OmniHuman', 'Kling', 'Sora', 'Grok', 'Suno', 'BETA', 'UTC',
    'Watch to Earn', 'Watch & Earn', 'Pay It Forward', 'Income Grid',
    'Profit Nexus', 'SuperSeller', 'ProSeller', 'CoPilot',
    'Coinbase Wallet', 'Trust Wallet', 'Banxa',
}

def should_keep(text):
    """Check if text should stay in English"""
    t = str(text).strip()
    if t in KEEP_ENGLISH:
        return True
    if len(t) <= 1:
        return True
    # Pure symbols/emoji
    if all(c in '✓✕✦⬇⟼✂↑↺📋📖🔒🌐🔷💡★©▶●○←→↗+·—–$#@%&*!?.:,;/\\|()[]{}' or ord(c) > 0x2000 for c in t.replace(' ','')):
        return True
    return False

# Complete translation dictionary for all languages
# Structure: translations[lang_code][namespace][key] = translated_text

def translate_all():
    """Generate translations for all languages"""
    
    results = {lang: {} for lang in LANGS}
    
    for ns, en_vals in en.items():
        if not isinstance(en_vals, dict):
            continue
        
        for lang in LANGS:
            if ns not in results[lang]:
                results[lang][ns] = {}
        
        for key, en_text in en_vals.items():
            if should_keep(en_text):
                for lang in LANGS:
                    results[lang][ns][key] = en_text
                continue
            
            # Generate translations for this key
            translations = translate_phrase(en_text)
            for lang, translated in translations.items():
                results[lang][ns][key] = translated
    
    return results

def translate_phrase(en_text):
    """Translate a single English phrase to all 19 languages"""
    t = str(en_text)
    
    # Check our master translation table
    if t in MASTER_TRANSLATIONS:
        return MASTER_TRANSLATIONS[t]
    
    # For untranslated strings, return EN as fallback
    # (i18next fallbackLng will handle this)
    return {lang: t for lang in LANGS}

# ============================================================
# MASTER TRANSLATION TABLE
# Complete translations for all UI strings
# ============================================================

MASTER_TRANSLATIONS = {}

def add(en_text, es='', fr='', de='', pt='', ar='', hi='', zh='', ja='', ko='', ru='', it='', nl='', pl='', tr='', vi='', th='', id_='', tl='', sw=''):
    """Add a translation entry"""
    MASTER_TRANSLATIONS[en_text] = {
        'es': es or en_text, 'fr': fr or en_text, 'de': de or en_text,
        'pt': pt or en_text, 'ar': ar or en_text, 'hi': hi or en_text,
        'zh': zh or en_text, 'ja': ja or en_text, 'ko': ko or en_text,
        'ru': ru or en_text, 'it': it or en_text, 'nl': nl or en_text,
        'pl': pl or en_text, 'tr': tr or en_text, 'vi': vi or en_text,
        'th': th or en_text, 'id': id_ or en_text, 'tl': tl or en_text,
        'sw': sw or en_text,
    }

# ── Common UI Terms ──
add('Save', 'Guardar','Enregistrer','Speichern','Salvar','حفظ','सहेजें','保存','保存','저장','Сохранить','Salva','Opslaan','Zapisz','Kaydet','Lưu','บันทึก','Simpan','I-save','Hifadhi')
add('Cancel', 'Cancelar','Annuler','Abbrechen','Cancelar','إلغاء','रद्द करें','取消','キャンセル','취소','Отмена','Annulla','Annuleren','Anuluj','İptal','Hủy','ยกเลิก','Batal','Kanselahin','Ghairi')
add('Delete', 'Eliminar','Supprimer','Löschen','Excluir','حذف','हटाएं','删除','削除','삭제','Удалить','Elimina','Verwijderen','Usuń','Sil','Xóa','ลบ','Hapus','Tanggalin','Futa')
add('Edit', 'Editar','Modifier','Bearbeiten','Editar','تحرير','संपादित करें','编辑','編集','편집','Редактировать','Modifica','Bewerken','Edytuj','Düzenle','Chỉnh sửa','แก้ไข','Edit','I-edit','Hariri')
add('Close', 'Cerrar','Fermer','Schließen','Fechar','إغلاق','बंद करें','关闭','閉じる','닫기','Закрыть','Chiudi','Sluiten','Zamknij','Kapat','Đóng','ปิด','Tutup','Isara','Funga')
add('Back', 'Atrás','Retour','Zurück','Voltar','رجوع','वापस','返回','戻る','뒤로','Назад','Indietro','Terug','Wstecz','Geri','Quay lại','กลับ','Kembali','Bumalik','Rudi')
add('Submit', 'Enviar','Soumettre','Absenden','Enviar','إرسال','सबमिट करें','提交','送信','제출','Отправить','Invia','Verzenden','Wyślij','Gönder','Gửi','ส่ง','Kirim','Isumite','Wasilisha')
add('Copy', 'Copiar','Copier','Kopieren','Copiar','نسخ','कॉपी करें','复制','コピー','복사','Копировать','Copia','Kopiëren','Kopiuj','Kopyala','Sao chép','คัดลอก','Salin','Kopyahin','Nakili')
add('Download', 'Descargar','Télécharger','Herunterladen','Baixar','تنزيل','डाउनलोड','下载','ダウンロード','다운로드','Скачать','Scarica','Downloaden','Pobierz','İndir','Tải xuống','ดาวน์โหลด','Unduh','I-download','Pakua')
add('Upload', 'Subir','Télécharger','Hochladen','Enviar','رفع','अपलोड','上传','アップロード','업로드','Загрузить','Carica','Uploaden','Prześlij','Yükle','Tải lên','อัปโหลด','Unggah','I-upload','Pakia')
add('Create', 'Crear','Créer','Erstellen','Criar','إنشاء','बनाएं','创建','作成','만들기','Создать','Crea','Aanmaken','Utwórz','Oluştur','Tạo','สร้าง','Buat','Gumawa','Unda')
add('Add', 'Agregar','Ajouter','Hinzufügen','Adicionar','إضافة','जोड़ें','添加','追加','추가','Добавить','Aggiungi','Toevoegen','Dodaj','Ekle','Thêm','เพิ่ม','Tambah','Idagdag','Ongeza')
add('Remove', 'Eliminar','Supprimer','Entfernen','Remover','إزالة','हटाएं','移除','削除','제거','Удалить','Rimuovi','Verwijderen','Usuń','Kaldır','Xóa','ลบ','Hapus','Alisin','Ondoa')
add('Search', 'Buscar','Rechercher','Suchen','Pesquisar','بحث','खोजें','搜索','検索','검색','Поиск','Cerca','Zoeken','Szukaj','Ara','Tìm kiếm','ค้นหา','Cari','Maghanap','Tafuta')
add('Reset', 'Restablecer','Réinitialiser','Zurücksetzen','Redefinir','إعادة تعيين','रीसेट करें','重置','リセット','초기화','Сбросить','Reimposta','Resetten','Resetuj','Sıfırla','Đặt lại','รีเซ็ต','Atur ulang','I-reset','Weka upya')
add('Apply', 'Aplicar','Appliquer','Anwenden','Aplicar','تطبيق','लागू करें','应用','適用','적용','Применить','Applica','Toepassen','Zastosuj','Uygula','Áp dụng','ใช้งาน','Terapkan','I-apply','Tumia')
add('Confirm', 'Confirmar','Confirmer','Bestätigen','Confirmar','تأكيد','पुष्टि करें','确认','確認','확인','Подтвердить','Conferma','Bevestigen','Potwierdź','Onayla','Xác nhận','ยืนยัน','Konfirmasi','Kumpirmahin','Thibitisha')
add('Continue', 'Continuar','Continuer','Weiter','Continuar','متابعة','जारी रखें','继续','続行','계속','Продолжить','Continua','Doorgaan','Kontynuuj','Devam et','Tiếp tục','ดำเนินการต่อ','Lanjutkan','Magpatuloy','Endelea')
add('Generate', 'Generar','Générer','Generieren','Gerar','إنشاء','उत्पन्न करें','生成','生成','생성','Сгенерировать','Genera','Genereren','Generuj','Oluştur','Tạo','สร้าง','Hasilkan','I-generate','Tengeneza')
add('Preview', 'Vista previa','Aperçu','Vorschau','Pré-visualizar','معاينة','पूर्वावलोकन','预览','プレビュー','미리보기','Предпросмотр','Anteprima','Voorbeeld','Podgląd','Önizleme','Xem trước','ดูตัวอย่าง','Pratinjau','Preview','Hakiki')
add('Publish', 'Publicar','Publier','Veröffentlichen','Publicar','نشر','प्रकाशित करें','发布','公開','게시','Опубликовать','Pubblica','Publiceren','Opublikuj','Yayınla','Xuất bản','เผยแพร่','Publikasikan','I-publish','Chapisha')
add('Duplicate', 'Duplicar','Dupliquer','Duplizieren','Duplicar','تكرار','डुप्लिकेट','复制','複製','복제','Дублировать','Duplica','Dupliceren','Duplikuj','Çoğalt','Nhân bản','ทำซ้ำ','Duplikat','I-duplicate','Nakili')
add('Share', 'Compartir','Partager','Teilen','Compartilhar','مشاركة','साझा करें','分享','共有','공유','Поделиться','Condividi','Delen','Udostępnij','Paylaş','Chia sẻ','แชร์','Bagikan','I-share','Shiriki')
add('Send', 'Enviar','Envoyer','Senden','Enviar','إرسال','भेजें','发送','送信','보내기','Отправить','Invia','Verzenden','Wyślij','Gönder','Gửi','ส่ง','Kirim','Ipadala','Tuma')
add('Select', 'Seleccionar','Sélectionner','Auswählen','Selecionar','اختيار','चुनें','选择','選択','선택','Выбрать','Seleziona','Selecteren','Wybierz','Seç','Chọn','เลือก','Pilih','Pumili','Chagua')
add('Customize', 'Personalizar','Personnaliser','Anpassen','Personalizar','تخصيص','अनुकूलित करें','自定义','カスタマイズ','사용자 지정','Настроить','Personalizza','Aanpassen','Dostosuj','Özelleştir','Tùy chỉnh','ปรับแต่ง','Sesuaikan','I-customize','Binafsisha')
add('Filter', 'Filtrar','Filtrer','Filtern','Filtrar','تصفية','फ़िल्टर','筛选','フィルター','필터','Фильтр','Filtra','Filteren','Filtruj','Filtrele','Lọc','กรอง','Saring','I-filter','Chuja')

# ── Status Words ──
add('Loading...', 'Cargando...','Chargement...','Laden...','Carregando...','جارٍ التحميل...','लोड हो रहा है...','加载中...','読み込み中...','로딩 중...','Загрузка...','Caricamento...','Laden...','Ładowanie...','Yükleniyor...','Đang tải...','กำลังโหลด...','Memuat...','Naglo-load...','Inapakia...')
add('Saving...', 'Guardando...','Enregistrement...','Speichern...','Salvando...','جارٍ الحفظ...','सहेजा जा रहा है...','保存中...','保存中...','저장 중...','Сохранение...','Salvataggio...','Opslaan...','Zapisywanie...','Kaydediliyor...','Đang lưu...','กำลังบันทึก...','Menyimpan...','Nagse-save...','Inahifadhi...')
add('Saved!', '¡Guardado!','Enregistré !','Gespeichert!','Salvo!','تم الحفظ!','सहेजा गया!','已保存！','保存完了！','저장됨!','Сохранено!','Salvato!','Opgeslagen!','Zapisano!','Kaydedildi!','Đã lưu!','บันทึกแล้ว!','Tersimpan!','Na-save na!','Imehifadhiwa!')
add('Published', 'Publicado','Publié','Veröffentlicht','Publicado','منشور','प्रकाशित','已发布','公開済み','게시됨','Опубликовано','Pubblicato','Gepubliceerd','Opublikowano','Yayınlandı','Đã xuất bản','เผยแพร่แล้ว','Dipublikasikan','Na-publish','Imechapishwa')
add('Draft', 'Borrador','Brouillon','Entwurf','Rascunho','مسودة','ड्राफ्ट','草稿','下書き','초안','Черновик','Bozza','Concept','Szkic','Taslak','Bản nháp','แบบร่าง','Draf','Draft','Rasimu')
add('Active', 'Activo','Actif','Aktiv','Ativo','نشط','सक्रिय','活跃','アクティブ','활성','Активный','Attivo','Actief','Aktywny','Aktif','Hoạt động','ใช้งานอยู่','Aktif','Aktibo','Hai')
add('Pending', 'Pendiente','En attente','Ausstehend','Pendente','قيد الانتظار','लंबित','待处理','保留中','대기 중','В ожидании','In attesa','In afwachting','Oczekujące','Beklemede','Đang chờ','รอดำเนินการ','Tertunda','Nakabinbin','Inasubiri')
add('Completed', 'Completado','Terminé','Abgeschlossen','Concluído','مكتمل','पूर्ण','已完成','完了','완료','Завершено','Completato','Voltooid','Zakończone','Tamamlandı','Hoàn thành','เสร็จสมบูรณ์','Selesai','Nakumpleto','Imekamilika')
add('Failed', 'Fallido','Échoué','Fehlgeschlagen','Falhou','فشل','विफल','失败','失敗','실패','Не удалось','Fallito','Mislukt','Nieudane','Başarısız','Thất bại','ล้มเหลว','Gagal','Nabigo','Imeshindwa')
add('Expired', 'Expirado','Expiré','Abgelaufen','Expirado','منتهي الصلاحية','समाप्त','已过期','期限切れ','만료됨','Истёк','Scaduto','Verlopen','Wygasło','Süresi doldu','Đã hết hạn','หมดอายุ','Kedaluwarsa','Nag-expire','Imeisha muda')
add('Confirmed', 'Confirmado','Confirmé','Bestätigt','Confirmado','مؤكد','पुष्ट','已确认','確認済み','확인됨','Подтверждено','Confermato','Bevestigd','Potwierdzone','Onaylandı','Đã xác nhận','ยืนยันแล้ว','Dikonfirmasi','Nakumpirma','Imethibitishwa')

# ── Navigation ──
add('Dashboard', 'Panel','Tableau de bord','Dashboard','Painel','لوحة المعلومات','डैशबोर्ड','仪表板','ダッシュボード','대시보드','Панель управления','Dashboard','Dashboard','Panel','Gösterge paneli','Bảng điều khiển','แดชบอร์ด','Dasbor','Dashboard','Dashibodi')
add('Account', 'Cuenta','Compte','Konto','Conta','الحساب','खाता','账户','アカウント','계정','Аккаунт','Account','Account','Konto','Hesap','Tài khoản','บัญชี','Akun','Account','Akaunti')
add('Settings', 'Configuración','Paramètres','Einstellungen','Configurações','الإعدادات','सेटिंग्स','设置','設定','설정','Настройки','Impostazioni','Instellingen','Ustawienia','Ayarlar','Cài đặt','การตั้งค่า','Pengaturan','Mga Setting','Mipangilio')
add('Help', 'Ayuda','Aide','Hilfe','Ajuda','مساعدة','सहायता','帮助','ヘルプ','도움말','Помощь','Aiuto','Help','Pomoc','Yardım','Trợ giúp','ช่วยเหลือ','Bantuan','Tulong','Msaada')
add('Support', 'Soporte','Support','Support','Suporte','الدعم','सहायता','支持','サポート','지원','Поддержка','Supporto','Ondersteuning','Wsparcie','Destek','Hỗ trợ','ฝ่ายสนับสนุน','Dukungan','Suporta','Msaada')
add('Profile', 'Perfil','Profil','Profil','Perfil','الملف الشخصي','प्रोफ़ाइल','个人资料','プロフィール','프로필','Профиль','Profilo','Profiel','Profil','Profil','Hồ sơ','โปรไฟล์','Profil','Profile','Wasifu')
add('Wallet', 'Billetera','Portefeuille','Geldbörse','Carteira','المحفظة','वॉलेट','钱包','ウォレット','지갑','Кошелёк','Portafoglio','Portemonnee','Portfel','Cüzdan','Ví','กระเป๋าเงิน','Dompet','Wallet','Pochi')
add('Explore', 'Explorar','Explorer','Entdecken','Explorar','استكشاف','खोजें','探索','探索','탐색','Обзор','Esplora','Verkennen','Odkryj','Keşfet','Khám phá','สำรวจ','Jelajahi','Tuklasin','Gundua')
add('Notifications', 'Notificaciones','Notifications','Benachrichtigungen','Notificações','إشعارات','सूचनाएं','通知','通知','알림','Уведомления','Notifiche','Meldingen','Powiadomienia','Bildirimler','Thông báo','การแจ้งเตือน','Notifikasi','Mga abiso','Arifa')
add('Legal', 'Legal','Mentions légales','Rechtliches','Legal','قانوني','कानूनी','法律条款','法的情報','법적 사항','Правовая информация','Legale','Juridisch','Prawne','Yasal','Pháp lý','กฎหมาย','Hukum','Legal','Kisheria')
add('Free Tools', 'Herramientas gratuitas','Outils gratuits','Kostenlose Tools','Ferramentas gratuitas','أدوات مجانية','मुफ़्त उपकरण','免费工具','無料ツール','무료 도구','Бесплатные инструменты','Strumenti gratuiti','Gratis tools','Darmowe narzędzia','Ücretsiz araçlar','Công cụ miễn phí','เครื่องมือฟรี','Alat gratis','Mga libreng tool','Zana za bure')

# ── UI Labels ──
add('Title', 'Título','Titre','Titel','Título','العنوان','शीर्षक','标题','タイトル','제목','Заголовок','Titolo','Titel','Tytuł','Başlık','Tiêu đề','ชื่อ','Judul','Pamagat','Kichwa')
add('Description', 'Descripción','Description','Beschreibung','Descrição','الوصف','विवरण','描述','説明','설명','Описание','Descrizione','Beschrijving','Opis','Açıklama','Mô tả','รายละเอียด','Deskripsi','Paglalarawan','Maelezo')
add('Name', 'Nombre','Nom','Name','Nome','الاسم','नाम','名称','名前','이름','Имя','Nome','Naam','Nazwa','Ad','Tên','ชื่อ','Nama','Pangalan','Jina')
add('Email', 'Correo electrónico','E-mail','E-Mail','E-mail','البريد الإلكتروني','ईमेल','电子邮件','メール','이메일','Электронная почта','Email','E-mail','E-mail','E-posta','Email','อีเมล','Email','Email','Barua pepe')
add('Password', 'Contraseña','Mot de passe','Passwort','Senha','كلمة المرور','पासवर्ड','密码','パスワード','비밀번호','Пароль','Password','Wachtwoord','Hasło','Şifre','Mật khẩu','รหัสผ่าน','Kata sandi','Password','Nenosiri')
add('Username', 'Nombre de usuario','Nom d\'utilisateur','Benutzername','Nome de usuário','اسم المستخدم','उपयोगकर्ता नाम','用户名','ユーザー名','사용자 이름','Имя пользователя','Nome utente','Gebruikersnaam','Nazwa użytkownika','Kullanıcı adı','Tên người dùng','ชื่อผู้ใช้','Nama pengguna','Username','Jina la mtumiaji')
add('Image', 'Imagen','Image','Bild','Imagem','صورة','छवि','图片','画像','이미지','Изображение','Immagine','Afbeelding','Obraz','Görsel','Hình ảnh','รูปภาพ','Gambar','Larawan','Picha')
add('Video', 'Vídeo','Vidéo','Video','Vídeo','فيديو','वीडियो','视频','動画','동영상','Видео','Video','Video','Wideo','Video','Video','วิดีโอ','Video','Video','Video')
add('Audio', 'Audio','Audio','Audio','Áudio','صوت','ऑडियो','音频','オーディオ','오디오','Аудио','Audio','Audio','Dźwięk','Ses','Âm thanh','เสียง','Audio','Audio','Sauti')
add('Link', 'Enlace','Lien','Link','Link','رابط','लिंक','链接','リンク','링크','Ссылка','Link','Link','Link','Bağlantı','Liên kết','ลิงก์','Tautan','Link','Kiungo')
add('Style', 'Estilo','Style','Stil','Estilo','نمط','शैली','样式','スタイル','스타일','Стиль','Stile','Stijl','Styl','Stil','Kiểu','สไตล์','Gaya','Istilo','Mtindo')
add('Size', 'Tamaño','Taille','Größe','Tamanho','حجم','आकार','大小','サイズ','크기','Размер','Dimensione','Grootte','Rozmiar','Boyut','Kích thước','ขนาด','Ukuran','Laki','Ukubwa')
add('Font', 'Fuente','Police','Schriftart','Fonte','خط','फ़ॉन्ट','字体','フォント','글꼴','Шрифт','Carattere','Lettertype','Czcionka','Yazı tipi','Phông','แบบอักษร','Font','Font','Fonti')
add('Colour', 'Color','Couleur','Farbe','Cor','لون','रंग','颜色','色','색상','Цвет','Colore','Kleur','Kolor','Renk','Màu sắc','สี','Warna','Kulay','Rangi')
add('Color', 'Color','Couleur','Farbe','Cor','لون','रंग','颜色','色','색상','Цвет','Colore','Kleur','Kolor','Renk','Màu sắc','สี','Warna','Kulay','Rangi')
add('Label', 'Etiqueta','Étiquette','Bezeichnung','Rótulo','تسمية','लेबल','标签','ラベル','라벨','Метка','Etichetta','Label','Etykieta','Etiket','Nhãn','ป้ายกำกับ','Label','Label','Lebo')
add('Category', 'Categoría','Catégorie','Kategorie','Categoria','فئة','श्रेणी','类别','カテゴリ','카테고리','Категория','Categoria','Categorie','Kategoria','Kategori','Danh mục','หมวดหมู่','Kategori','Kategorya','Kategoria')
add('Tags', 'Etiquetas','Tags','Tags','Tags','العلامات','टैग','标签','タグ','태그','Теги','Tag','Tags','Tagi','Etiketler','Thẻ','แท็ก','Tag','Mga tag','Tagi')
add('Total', 'Total','Total','Gesamt','Total','المجموع','कुल','总计','合計','합계','Итого','Totale','Totaal','Razem','Toplam','Tổng','รวม','Total','Kabuuan','Jumla')
add('Free', 'Gratis','Gratuit','Kostenlos','Grátis','مجاني','मुफ़्त','免费','無料','무료','Бесплатно','Gratuito','Gratis','Bezpłatne','Ücretsiz','Miễn phí','ฟรี','Gratis','Libre','Bure')
add('Copied', 'Copiado','Copié','Kopiert','Copiado','تم النسخ','कॉपी किया गया','已复制','コピー済み','복사됨','Скопировано','Copiato','Gekopieerd','Skopiowano','Kopyalandı','Đã sao chép','คัดลอกแล้ว','Disalin','Nakopya','Imenakiliwa')
add('Copied!', '¡Copiado!','Copié !','Kopiert!','Copiado!','تم النسخ!','कॉपी किया गया!','已复制！','コピーしました！','복사됨!','Скопировано!','Copiato!','Gekopieerd!','Skopiowano!','Kopyalandı!','Đã sao chép!','คัดลอกแล้ว!','Disalin!','Nakopya!','Imenakiliwa!')
add('Copy URL', 'Copiar URL','Copier l\'URL','URL kopieren','Copiar URL','نسخ الرابط','URL कॉपी करें','复制链接','URLをコピー','URL 복사','Копировать URL','Copia URL','URL kopiëren','Kopiuj URL','URL\'yi kopyala','Sao chép URL','คัดลอก URL','Salin URL','Kopyahin ang URL','Nakili URL')
add('Copy link', 'Copiar enlace','Copier le lien','Link kopieren','Copiar link','نسخ الرابط','लिंक कॉपी करें','复制链接','リンクをコピー','링크 복사','Копировать ссылку','Copia link','Link kopiëren','Kopiuj link','Bağlantıyı kopyala','Sao chép liên kết','คัดลอกลิงก์','Salin tautan','Kopyahin ang link','Nakili kiungo')

print(f"Master translation table: {len(MASTER_TRANSLATIONS)} entries")
print("This covers the common UI terms. Writing to file...")

# Save the translation table for use
with open('/tmp/master_translations.json', 'w') as f:
    json.dump(MASTER_TRANSLATIONS, f, indent=2, ensure_ascii=False)

