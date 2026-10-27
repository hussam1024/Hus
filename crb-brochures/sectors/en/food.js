// English text for the Food Security & Livelihoods brochure.
// Merged by position over ../food.js – numbers, photos and icons come from the Arabic file.
module.exports = {
  name: 'Food Security & Livelihoods', file: 'CRB-FSL-EN',
  en: 'الأمن الغذائي وسبل العيش',
  cover: { h1: 'Food Security', h1Size: '25pt', h2: '&amp; Livelihoods', h2Size: '19pt' },
  back: {
    text: 'We work within the humanitarian coordination system for food security, in partnership with local, regional and international donors and organizations.',
    roles: [
      { title: 'Food Security &amp; Agriculture Cluster – Co&#8209;chair, Marib Hub', desc: 'Co-leading the cluster in the Marib hub' },
      { title: 'Integrated Food Security Phase Classification', desc: 'Technical participation in the 2025 IPC analysis' },
    ],
  },
  story: {
    headline: 'Small Support, Great Impact:<br>Amina’s Story with CRB and YHF',
    paras: [
      'Amina Ahmed, a 57-year-old widow and mother of five, fled her village in Raymah Governorate when the fighting drew near. She settled with her children in a tent in Jaw Al-Naseem Camp in Marib, until floods swept away what little hope they had left.',
      'Then came cash assistance from an emergency food assistance project funded by the Yemen Humanitarian Fund (YHF) and implemented by the Coalition of Relief and Building (CRB). She bought flour and a small clay oven, and began baking bread for her children with her own hands.',
      'Today, Amina buys food, water and some of her children’s needs with the same support. Her story is living proof that simple humanitarian assistance can restore a woman’s dignity and give her the chance to start again.',
    ],
    quotes: [
      { text: 'I felt like a mother again… I felt that I existed, that I could stand on my own two feet.', cite: 'Amina Ahmed, Jaw Al-Naseem Camp – Marib' },
      { text: 'I no longer have to ask people for help… I hold my head high, and my children go to bed with full stomachs.', size: null },
    ],
  },
  overview: {
    title: 'Food Security &amp;<br>Livelihoods (FSL)', kicker: 'A Decade of Food Response 2016 – 2025',
    intro: 'Over the past decade, the Coalition of Relief and Building (CRB) has implemented a series of humanitarian and development projects in food security and livelihoods, targeting the most vulnerable groups across 19 Yemeni governorates through emergency, seasonal and sustainable interventions alike.',
    stats: [{ label: 'Yemeni Governorates' }, { label: 'Years of Giving' }],
    photo: { cap: 'Food basket distribution' },
  },
  programs: [{ name: 'Emergency Food' }, { name: 'Seasonal Food' }, { name: 'Economic Empowerment' }],
  middle: {
    blocks: [
      {
        title: 'Emergency Food Projects', sub: 'Life-saving cash and in-kind assistance',
        text: 'Focused on a rapid response to the food needs of the most vulnerable families—especially during displacement, floods and sudden crises—helping to save lives and ease the impact of food insecurity.',
        photos: [{ cap: 'Cash assistance distribution' }, { cap: 'Ready-meal distribution' }],
      },
      {
        title: 'Seasonal Food Projects', sub: 'Ramadan and Eid al-Adha seasons',
        text: 'Distribution of food supplies and Udhiyah (sacrificial) meat to displaced and vulnerable families during Ramadan and Eid al-Adha.',
        cards: [{ name: 'Ramadan food supplies' }, { name: 'Udhiyah meat distribution' }],
      },
    ],
  },
  left: {
    blocks: [{
      title: 'Economic Empowerment Projects', sub: 'Vocational training and livelihoods',
      text: 'Over the past three years, CRB has gradually shifted toward livelihood programs that give families, young men and young women the chance to move from dependence on aid to self-reliance, and to start small businesses that secure a stable income.',
      checks: ['Vocational and entrepreneurship training', 'Provision of small production tools', 'Support for small family businesses', 'Supporting farmers, women and youth'],
    }],
    grid: { items: [{ cap: 'Supporting farmers' }, { cap: 'Vocational training' }, { cap: 'Economic empowerment kits' }, { cap: 'Youth skills training' }] },
    sdg: { text: 'From emergency relief to self-reliance and community resilience.' },
  },
};
