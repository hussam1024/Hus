// English text for the Health brochure (merged over ../health.js).
module.exports = {
  name: 'Health', file: 'CRB-Health-EN',
  en: 'الصحة',
  cover: { h1: 'Health', h1Size: '36pt', h2: 'Healthcare for<br>the Most Vulnerable', h2Size: '13pt' },
  back: {
    text: 'We work within the humanitarian coordination system for health, in partnership with local, regional and international donors and organizations.',
    roles: [
      { title: 'UN OCHA and the Humanitarian Clusters', desc: 'Active participation in clusters and technical committees' },
      { title: 'Yemen Humanitarian Fund', desc: 'Official implementing partner of the YHF' },
    ],
  },
  story: {
    headline: 'A Dialysis Machine Restores Hope for Patients in Harib District',
    paras: [
      'In Harib District, Marib Governorate, kidney failure patients endured daily suffering. Mohammed Al-Otair Hospital faced a severe shortage of dialysis machines, and many patients had to travel long distances in search of a life-saving session.',
      'As part of its efforts to support health services in the hardest-hit areas, the Coalition of Relief and Building (CRB) provided the hospital with a new dialysis machine, enabling it to receive more patients and offer regular sessions without long waiting lists.',
      'Patients expressed deep relief at this change, affirming that the new machine has eased burdens that weighed on their daily lives—turning long-standing suffering into a story of hope.',
    ],
    quotes: [
      { text: 'This support came at a critical time, and the machine will make a real difference in the hospital’s ability to save lives.', cite: 'Dr. Suleiman Al-Musalmani, Hospital Director' },
    ],
  },
  overview: {
    title: 'Health Sector', kicker: 'A Decade of Health Support 2016 – 2025',
    intro: 'The Coalition of Relief and Building (CRB) has provided essential health support to the most vulnerable groups, especially in areas affected by conflict and crises, through emergency and sustainable projects including mobile clinics, medical treatment assistance, and building, rehabilitating and equipping health centers.',
    stats: [{ label: 'Beneficiaries of Epidemic Response' }, { label: 'Years of Giving' }],
    photo: { cap: 'Al-Suwaida Medical Center' },
  },
  programs: [{ name: 'Emergency Health' }, { name: 'Sustainable Health' }],
  middle: {
    blocks: [{
      title: 'Emergency Health Projects', sub: 'Urgent interventions that save lives',
      text: 'CRB carried out urgent health interventions, including mobile medical clinics in displacement camps, treatment of emergency cases, and distribution of medicines and medical supplies to health centers, as well as awareness and response activities and the rehabilitation of COVID-19 isolation centers.',
      items: [
        { name: 'Epidemic response', note: 'COVID-19 and cholera' },
        { name: 'Combating malnutrition' },
        { name: 'Operating health centers' },
        { name: 'Medical treatment assistance' },
        { name: 'Mobile medical clinic' },
      ],
    }],
    grid: { items: [{ cap: 'Treating medical cases' }, { cap: 'Health services for children' }, { cap: 'Medicines for quarantine centers' }] },
  },
  left: {
    blocks: [{
      title: 'Sustainable Health Projects', sub: 'Ready and sustainable health facilities',
      text: 'CRB’s health activities included building, rehabilitating and operating health centers and providing specialized medical equipment, as part of its efforts to sustain health services and strengthen the readiness of local facilities.',
      items: [
        { name: 'Building &amp; rehabilitating health centers' },
        { name: 'Medical devices &amp; equipment' },
      ],
    }],
    grid: { items: [{ cap: 'Dar Al-Khair Medical Center' }, { cap: 'Medical center furniture &amp; equipment' }, { cap: 'Oxygen cylinders' }, { cap: 'Wheelchairs' }] },
    sdg: { text: 'Closer, better-equipped health services for those most in need.' },
  },
};
