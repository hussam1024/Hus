// English text for the Protection brochure (merged over ../protection.js).
module.exports = {
  name: 'Protection', file: 'CRB-Protection-EN',
  en: 'الحماية',
  cover: { h1: 'Protection', h1Size: '32pt', h2: 'Supporting Children &amp;<br>Vulnerable Families', h2Size: '13pt' },
  back: {
    text: 'We work within the humanitarian coordination system for protection, in partnership with local, regional and international donors and organizations.',
    roles: [
      { title: 'UN OCHA and the Humanitarian Clusters', desc: 'Active participation in clusters and technical committees' },
      { title: 'Yemen Humanitarian Fund', desc: 'Official implementing partner of the YHF' },
    ],
  },
  gallery: {
    title: 'From the Field', sub: 'Snapshots from our protection projects',
    text: 'Diverse, targeted community interventions that place children and vulnerable families at the heart of the response.',
    grid: { items: [
      { cap: 'Recreational activities for children' },
      { cap: 'Awareness sessions' },
      { cap: 'Group psychosocial support' },
      { cap: 'Cash assistance' },
      { cap: 'Tents and dates distribution' },
    ] },
  },
  overview: {
    title: 'Protection Sector', kicker: 'A Decade of Protecting the Most Vulnerable',
    intro: 'The Coalition of Relief and Building (CRB) has worked to protect the most vulnerable groups and crisis-affected communities through diverse, targeted community interventions, with a focus on supporting children and vulnerable families.',
    stats: [{ label: 'Sponsored Orphans' }, { label: 'Years of Giving' }],
    photo: { cap: 'Orphan sponsorship project' },
  },
  programs: [{ name: 'Emergency Response' }, { name: 'Psychosocial Support' }, { name: 'Care for Children Who Lost Their Provider' }],
  middle: {
    blocks: [
      {
        title: 'Emergency Response', sub: 'and Cash-Based Protection',
        text: 'Emergency cash assistance for the most vulnerable families and the provision of medical and shelter supplies in emergencies, alongside limited support for critical health cases to stabilize affected families.',
        items: [
          { name: 'Shelter &amp; food interventions', note: 'For vulnerable cases' },
          { name: 'Urgent cash assistance', note: 'For the most vulnerable families' },
          { name: 'Support for emergency medical cases' },
        ],
      },
      {
        title: 'Psychosocial Support', sub: 'Community-Based Protection – GBV',
        text: 'Psychosocial support programs and community protection and empowerment activities inside camps that strengthen resilience and recovery, especially for women and children.',
        items: [
          { name: 'Play spaces &amp; parks for children' },
          { name: 'Recreational &amp; educational activities for children' },
          { name: 'Psychosocial support sessions', note: 'For children and women in camps' },
        ],
      },
    ],
    grid: { items: [{ cap: 'Support for medical cases' }, { cap: 'Park and play area' }] },
  },
  left: {
    blocks: [{
      title: 'Care for Children Who Lost Their Provider', sub: 'Sponsorship and care with dignity',
      text: 'Ongoing humanitarian programs to sponsor orphans and families who have lost their breadwinner, meeting their food and education needs—such as free daily bread for the neediest families—so that they can secure their basic needs with dignity and sustainability.',
      items: [
        { name: 'Orphan sponsorship', label: 'Orphans' },
        { name: 'Clothing (Kiswa) project' },
        { name: 'Education &amp; health care' },
      ],
    }],
    grid: { items: [{ cap: 'Clothing project' }, { cap: 'Food support for families' }] },
  },
};
