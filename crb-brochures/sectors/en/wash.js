// English text for the Water, Sanitation & Hygiene brochure (merged over ../wash.js).
module.exports = {
  name: 'Water, Sanitation & Hygiene', file: 'CRB-WASH-EN',
  en: 'المياه والصرف الصحي والنظافة الصحية',
  cover: { h1: 'Water, Sanitation', h1Size: '21pt', h2: '&amp; Hygiene (WASH)', h2Size: '18pt' },
  back: {
    text: 'We work within the humanitarian coordination system for water, sanitation and hygiene, in partnership with local, regional and international donors and organizations.',
    roles: [
      { title: 'UN OCHA and the Humanitarian Clusters', desc: 'Active participation in clusters and technical committees' },
      { title: 'Yemen Humanitarian Fund', desc: 'Official implementing partner of the YHF' },
    ],
  },
  story: {
    headline: 'Bringing Hope to Al-Qawz Al-Rumaila Camp – Marib',
    paras: [
      'In Al-Qawz Al-Rumaila camp for displaced people, water was a major challenge for residents. Since Ali Sharqi and his family arrived at the camp at the end of 2017, he had to send his children to fetch water from far away, exposing them to the dangers of the road.',
      'CARE, in cooperation with the Coalition of Relief and Building (CRB), launched a project to drill a well in the camp, then installed an integrated tank with water distributed to points inside the camp—transforming residents’ lives.',
    ],
    quotes: [
      { text: 'Before the project, we had to walk long distances to fetch water, and the water we got was unclean and made us very sick.', size: null },
      { text: 'Thanks to the project, we now have a clean water network that reaches our homes directly. We also benefited from hygiene awareness campaigns that taught us how to keep water clean and avoid disease.', size: null, cite: 'Ali Sharqi, Al-Qawz Al-Rumaila Camp – Marib' },
    ],
  },
  overview: {
    title: 'Water, Sanitation<br>&amp; Hygiene (WASH)', titleSize: '15pt', kicker: 'A Decade of Strengthening Water Security',
    intro: 'Over the past decade, the Coalition of Relief and Building (CRB) has worked to strengthen water and health security in target communities through emergency and development programs that ensure access to safe, clean water and improve hygiene and public health services, with special attention to the most vulnerable in areas affected by displacement and disasters.',
    stats: [{ label: 'Well Drilling &amp; Rehabilitation Projects' }, { label: 'Years of Giving' }],
    photo: { cap: 'Inauguration of an elevated water tank' },
  },
  programs: [{ name: 'Emergency Water' }, { name: 'Sustainable Water' }],
  middle: {
    blocks: [{
      title: 'Emergency Water Projects', sub: 'Safe water that saves lives and limits disease',
      text: 'CRB carried out emergency interventions that help save lives and curb the spread of disease by distributing clean, safe water and setting up emergency distribution points in displacement areas and camps, alongside hygiene awareness campaigns, hygiene kit distribution, water chlorination and training for community committees.',
      items: [
        { name: 'Water trucking' },
        { name: 'Fixed distribution points', note: 'Safe drinking water' },
        { name: 'Hygiene kit distribution' },
        { name: 'Water tanks and latrines' },
      ],
    }],
    grid: { items: [{ cap: 'Water supply project' }, { cap: 'Setting up distribution points' }, { cap: 'Hygiene kit distribution' }] },
  },
  left: {
    blocks: [{
      title: 'Sustainable Water Projects', sub: 'Long-term water and sanitation solutions',
      text: 'Building and rehabilitating water sources and infrastructure for host communities and displaced people alike, strengthening community resilience and the sustainability of water resources.',
      items: [
        { name: 'Drilling &amp; rehabilitating artesian wells' },
        { name: 'Digging shallow (hand&#8209;dug) wells' },
        { name: 'Building elevated water tanks' },
        { name: 'Water network connections' },
        { name: 'Sewage networks' },
      ],
    }],
    grid: { items: [{ cap: 'Drilling an artesian well' }, { cap: 'Solar-powered water system' }] },
    sdg: { text: 'Safe, sustainable water for host and displaced communities.' },
  },
};
