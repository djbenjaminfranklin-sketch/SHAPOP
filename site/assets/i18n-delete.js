// Page « Supprimer mon compte » (shapop.app/delete-account) — exigée par Google Play.
(function () {
  var T = window.SP_T = window.SP_T || {};
  var add = function (l, foot, del) {
    T[l] = T[l] || {};
    T[l].foot = T[l].foot || {};
    T[l].foot.del = foot;
    T[l].del = del;
  };
  add('en', 'Delete my account', {
    metaTitle: 'Delete your ShaPop account',
    metaDesc: 'How to delete your ShaPop account and what happens to your data.',
    kicker: 'Account',
    title: 'Delete your ShaPop account',
    p: 'You can delete your account at any time, for free. It takes less than a minute.',
    appH: 'From the app (immediate)',
    s1: 'Open ShaPop and sign in.',
    s2: 'Go to <b>Profile</b>, then <b>Account controls</b>.',
    s3: 'Tap <b>Delete my account</b> and confirm.',
    mailH: 'Without the app',
    mailP: 'Write to {mail} from the email address of your account, with the subject “Delete my account”. We delete it within 30 days and confirm by email.',
    goneH: 'What is deleted',
    gone: '<ul><li>Your profile, photo, name and username</li><li>Your seller page, listings and followers</li><li>Your favourites, alerts and settings</li><li>Your phone number and contact details</li><li>Your sign-in account</li></ul>',
    keptH: 'What we keep, and for how long',
    kept: '<ul><li>Orders, payments and proof of handover: kept as long as required by accounting and tax law (up to 7 years), then deleted.</li><li>Dispute and fraud records: kept until the case is closed, then up to 3 years.</li><li>Live recordings linked to a dispute: kept until the dispute is closed.</li></ul>',
    note: 'Ongoing orders must be completed or refunded before the account can be deleted.'
  });
  add('fr', 'Supprimer mon compte', {
    metaTitle: 'Supprimer ton compte ShaPop',
    metaDesc: 'Comment supprimer ton compte ShaPop et ce que deviennent tes données.',
    kicker: 'Compte',
    title: 'Supprimer ton compte ShaPop',
    p: 'Tu peux supprimer ton compte à tout moment, gratuitement. Ça prend moins d’une minute.',
    appH: 'Depuis l’app (immédiat)',
    s1: 'Ouvre ShaPop et connecte-toi.',
    s2: 'Va dans <b>Profil</b>, puis <b>Contrôles du compte</b>.',
    s3: 'Appuie sur <b>Supprimer mon compte</b> et confirme.',
    mailH: 'Sans l’app',
    mailP: 'Écris à {mail} depuis l’adresse e-mail de ton compte, avec l’objet « Supprimer mon compte ». Nous le supprimons sous 30 jours et te le confirmons par e-mail.',
    goneH: 'Ce qui est supprimé',
    gone: '<ul><li>Ton profil, ta photo, ton nom et ton pseudo</li><li>Ta page vendeur, tes annonces et tes abonnés</li><li>Tes favoris, alertes et réglages</li><li>Ton numéro de téléphone et tes coordonnées</li><li>Ton compte de connexion</li></ul>',
    keptH: 'Ce que nous gardons, et combien de temps',
    kept: '<ul><li>Commandes, paiements et preuves de remise : gardés le temps exigé par la loi comptable et fiscale (jusqu’à 7 ans), puis supprimés.</li><li>Dossiers de litige et de fraude : gardés jusqu’à la clôture du dossier, puis 3 ans au plus.</li><li>Enregistrements de directs liés à un litige : gardés jusqu’à la clôture du litige.</li></ul>',
    note: 'Les commandes en cours doivent être terminées ou remboursées avant la suppression du compte.'
  });
  add('es', 'Eliminar mi cuenta', {
    metaTitle: 'Eliminar tu cuenta de ShaPop',
    metaDesc: 'Cómo eliminar tu cuenta de ShaPop y qué pasa con tus datos.',
    kicker: 'Cuenta',
    title: 'Eliminar tu cuenta de ShaPop',
    p: 'Puedes eliminar tu cuenta en cualquier momento, gratis. Tarda menos de un minuto.',
    appH: 'Desde la app (inmediato)',
    s1: 'Abre ShaPop e inicia sesión.',
    s2: 'Ve a <b>Perfil</b> y luego a <b>Controles de la cuenta</b>.',
    s3: 'Toca <b>Eliminar mi cuenta</b> y confirma.',
    mailH: 'Sin la app',
    mailP: 'Escribe a {mail} desde el correo de tu cuenta, con el asunto «Eliminar mi cuenta». La eliminamos en un plazo de 30 días y te lo confirmamos por correo.',
    goneH: 'Qué se elimina',
    gone: '<ul><li>Tu perfil, foto, nombre y usuario</li><li>Tu página de vendedor, anuncios y seguidores</li><li>Tus favoritos, alertas y ajustes</li><li>Tu número de teléfono y datos de contacto</li><li>Tu cuenta de acceso</li></ul>',
    keptH: 'Qué conservamos y durante cuánto tiempo',
    kept: '<ul><li>Pedidos, pagos y pruebas de entrega: el tiempo que exige la ley contable y fiscal (hasta 7 años), y después se eliminan.</li><li>Expedientes de disputas y fraude: hasta el cierre del caso y después 3 años como máximo.</li><li>Grabaciones de directos ligadas a una disputa: hasta el cierre de la disputa.</li></ul>',
    note: 'Los pedidos en curso deben completarse o reembolsarse antes de eliminar la cuenta.'
  });
  add('ru', 'Удалить аккаунт', {
    metaTitle: 'Удаление аккаунта ShaPop',
    metaDesc: 'Как удалить аккаунт ShaPop и что происходит с твоими данными.',
    kicker: 'Аккаунт',
    title: 'Удаление аккаунта ShaPop',
    p: 'Ты можешь удалить аккаунт в любой момент, бесплатно. Это займёт меньше минуты.',
    appH: 'В приложении (сразу)',
    s1: 'Открой ShaPop и войди в аккаунт.',
    s2: 'Перейди в <b>Профиль</b>, затем в <b>Настройки аккаунта</b>.',
    s3: 'Нажми <b>Удалить аккаунт</b> и подтверди.',
    mailH: 'Без приложения',
    mailP: 'Напиши на {mail} с адреса почты твоего аккаунта, с темой «Удалить аккаунт». Мы удалим его в течение 30 дней и подтвердим по почте.',
    goneH: 'Что удаляется',
    gone: '<ul><li>Профиль, фото, имя и никнейм</li><li>Страница продавца, объявления и подписчики</li><li>Избранное, уведомления и настройки</li><li>Номер телефона и контактные данные</li><li>Учётная запись для входа</li></ul>',
    keptH: 'Что мы храним и как долго',
    kept: '<ul><li>Заказы, платежи и подтверждения передачи: столько, сколько требует бухгалтерский и налоговый закон (до 7 лет), затем удаляются.</li><li>Материалы споров и мошенничества: до закрытия дела, затем не более 3 лет.</li><li>Записи эфиров, связанные со спором: до закрытия спора.</li></ul>',
    note: 'Текущие заказы нужно завершить или вернуть деньги до удаления аккаунта.'
  });
  add('he', 'מחיקת החשבון שלי', {
    metaTitle: 'מחיקת חשבון ShaPop',
    metaDesc: 'איך מוחקים את חשבון ShaPop ומה קורה למידע שלכם.',
    kicker: 'חשבון',
    title: 'מחיקת חשבון ShaPop',
    p: 'אפשר למחוק את החשבון בכל עת, בחינם. זה לוקח פחות מדקה.',
    appH: 'מתוך האפליקציה (מיידי)',
    s1: 'פותחים את ShaPop ומתחברים.',
    s2: 'עוברים אל <b>פרופיל</b> ואז אל <b>הגדרות חשבון</b>.',
    s3: 'מקישים על <b>מחיקת החשבון שלי</b> ומאשרים.',
    mailH: 'בלי האפליקציה',
    mailP: 'כתבו אל {mail} מכתובת המייל של החשבון, עם הנושא „מחיקת החשבון שלי”. נמחק אותו תוך 30 יום ונאשר במייל.',
    goneH: 'מה נמחק',
    gone: '<ul><li>הפרופיל, התמונה, השם ושם המשתמש</li><li>דף המוכר, המודעות והעוקבים</li><li>המועדפים, ההתראות וההגדרות</li><li>מספר הטלפון ופרטי הקשר</li><li>חשבון ההתחברות</li></ul>',
    keptH: 'מה נשמר ולכמה זמן',
    kept: '<ul><li>הזמנות, תשלומים והוכחות מסירה: לפי הנדרש בחוק החשבונאות והמס (עד 7 שנים), ואז נמחקים.</li><li>תיקי מחלוקות והונאה: עד סגירת התיק, ואז עד 3 שנים לכל היותר.</li><li>הקלטות שידור הקשורות למחלוקת: עד סגירת המחלוקת.</li></ul>',
    note: 'יש להשלים או להחזיר כסף על הזמנות פתוחות לפני מחיקת החשבון.'
  });
})();
