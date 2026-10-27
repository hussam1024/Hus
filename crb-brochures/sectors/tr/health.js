// Sağlık broşürünün Türkçe metni (../health.js üzerine birleştirilir).
module.exports = {
  name: 'Sağlık', file: 'CRB-Health-TR',
  en: 'الصحة',
  cover: { h1: 'Sağlık', h1Size: '40pt', h2: 'En Kırılgan Kesimler İçin<br>Sağlık Hizmeti', h2Size: '13pt' },
  back: {
    text: 'Sağlık alanında insani koordinasyon sistemi içinde; yerel, bölgesel ve uluslararası bağışçılar ve kuruluşlarla ortaklık hâlinde çalışıyoruz.',
    roles: [
      { title: 'BM OCHA ve İnsani Yardım Kümeleri', desc: 'Kümelerde ve teknik komitelerde aktif katılım' },
      { title: 'Yemen İnsani Yardım Fonu', desc: 'YHF’nin resmî uygulayıcı ortağı' },
    ],
  },
  story: {
    headline: 'Bir Diyaliz Makinesi, Harib İlçesindeki Hastalara Umut Oldu',
    paras: [
      'Marib iline bağlı Harib ilçesinde böbrek yetmezliği hastaları her gün büyük sıkıntı yaşıyordu. Mohammed Al-Otair Hastanesi’nde ciddi bir diyaliz makinesi açığı vardı ve pek çok hasta hayat kurtaran bir seans için uzun mesafeler kat etmek zorunda kalıyordu.',
      'En çok etkilenen bölgelerde sağlık hizmetlerini destekleme çalışmaları kapsamında Coalition of Relief and Building (CRB), hastaneye yeni bir diyaliz makinesi sağladı. Böylece hastane daha fazla hasta kabul edebilir ve uzun bekleme listeleri olmadan düzenli seanslar sunabilir hâle geldi.',
      'Hastalar bu değişiklikten duydukları derin rahatlamayı dile getirerek yeni makinenin günlük yaşamlarındaki yükü hafiflettiğini vurguladı; uzun süren çaresizlik bir umut hikâyesine dönüştü.',
    ],
    quotes: [
      { text: 'Bu destek tam da kritik bir zamanda geldi; makine, hastanenin hayat kurtarma kapasitesinde gerçek bir fark yaratacak.', cite: 'Dr. Suleiman Al-Musalmani, Hastane Müdürü' },
    ],
  },
  overview: {
    title: 'Sağlık Sektörü', kicker: 'Sağlık Desteğinde 10 Yıl 2016 – 2025',
    intro: 'Coalition of Relief and Building (CRB), özellikle çatışma ve krizlerden etkilenen bölgelerde en kırılgan kesimlere temel sağlık desteği sağladı. Acil ve sürdürülebilir projeler; mobil klinikleri, tedavi yardımlarını ve sağlık merkezlerinin inşası, rehabilitasyonu ve donatılmasını kapsadı.',
    stats: [{ label: 'Salgınla Mücadele Faydalanıcısı' }, { label: 'Yıllık Hizmet' }],
    photo: { cap: 'Al-Suwaida Sağlık Merkezi' },
  },
  programs: [{ name: 'Acil Sağlık' }, { name: 'Sürdürülebilir Sağlık' }],
  middle: {
    blocks: [{
      title: 'Acil Sağlık Projeleri', sub: 'Hayat kurtaran acil müdahaleler',
      text: 'CRB; yerinden edilmiş kişilerin kamplarında mobil sağlık klinikleri, acil vakaların tedavisi ve sağlık merkezlerine ilaç ve tıbbi malzeme dağıtımının yanı sıra bilinçlendirme ve müdahale faaliyetleri ile COVID-19 izolasyon merkezlerinin rehabilitasyonunu içeren acil sağlık müdahaleleri gerçekleştirdi.',
      items: [
        { name: 'Salgınla mücadele', note: 'COVID-19 ve kolera' },
        { name: 'Yetersiz beslenmeyle mücadele' },
        { name: 'Sağlık merkezlerinin işletilmesi' },
        { name: 'Tedavi yardımları' },
        { name: 'Mobil sağlık kliniği' },
      ],
    }],
    grid: { items: [{ cap: 'Hastaların tedavisi' }, { cap: 'Çocuklara sağlık hizmeti' }, { cap: 'Karantina merkezleri için ilaç' }] },
  },
  left: {
    blocks: [{
      title: 'Sürdürülebilir Sağlık Projeleri', sub: 'Hazır ve sürdürülebilir sağlık tesisleri',
      text: 'CRB’nin sağlık alanındaki faaliyetleri; sağlık hizmetlerinin sürdürülebilirliğini sağlama ve yerel tesislerin hazırlık düzeyini artırma çabalarının bir parçası olarak sağlık merkezlerinin inşası, rehabilitasyonu ve işletilmesini ve uzmanlık gerektiren tıbbi cihazların teminini kapsadı.',
      items: [
        { name: 'Sağlık merkezi inşası ve rehabilitasyonu' },
        { name: 'Tıbbi cihaz ve ekipman temini' },
      ],
    }],
    grid: { items: [{ cap: 'Dar Al-Khair Sağlık Merkezi' }, { cap: 'Sağlık merkezi mobilya ve ekipmanı' }, { cap: 'Oksijen tüpleri' }, { cap: 'Tekerlekli sandalyeler' }] },
    sdg: { text: 'En çok ihtiyaç duyanlara daha yakın ve daha donanımlı sağlık hizmetleri.' },
  },
};
