// English text for the Education brochure (merged over ../education.js).
module.exports = {
  name: 'Education', file: 'CRB-Education-EN',
  en: 'التعليم',
  cover: { h1: 'Education', h1Size: '32pt', h2: 'Learning Opportunities<br>for Children &amp; Youth', h2Size: '13pt' },
  back: {
    text: 'We work within the humanitarian coordination system for education in emergencies, in partnership with local, regional and international donors and organizations.',
    roles: [
      { title: 'National Education in Emergencies Network', desc: 'Active member of the national network affiliated with INEE' },
      { title: 'UN OCHA and the Humanitarian Clusters', desc: 'Active participation in clusters and technical committees' },
    ],
  },
  story: {
    headline: 'From a Tent to a Classroom: Al-Zubairi School Opens Doors of Hope for the Children of Al-Suwaida Camp – Marib',
    paras: [
      'In Al-Suwaida camp in Marib Governorate, hundreds of children were learning inside temporary tents, in harsh conditions of extreme heat and sandstorms.',
      'In response, the Coalition of Relief and Building (CRB), with support from the Türkiye Diyanet Foundation, built the Al-Zubairi Model School inside the camp: 12 classrooms equipped with basic facilities, providing a safe learning environment that preserves children’s dignity.',
    ],
    quotes: [
      { text: 'We used to study inside tents, but today we have real classrooms, chairs and blackboards… I feel I can focus and dream of a better future.', size: null },
      { text: 'I won’t miss school, and I will achieve my dream of becoming a doctor.', cite: 'Al-Anoud Othman, 11 years old' },
    ],
  },
  overview: {
    title: 'Education Sector', kicker: 'A Decade of Supporting Education 2016 – 2025',
    intro: 'Over the past decade, the Coalition of Relief and Building (CRB) has worked to expand learning opportunities for children and youth, focusing on areas affected by displacement and disasters, through emergency and sustainable projects that improve the learning environment and provide essential tools and facilities.',
    stats: [{ label: 'Beneficiaries of School Bags &amp; Uniforms' }, { label: 'Years of Giving' }],
    photo: { cap: 'School bag distribution' },
  },
  programs: [{ name: 'Emergency Education' }, { name: 'Sustainable Education' }],
  middle: {
    blocks: [{
      title: 'Emergency Education Projects', sub: 'Keeping learning going in difficult conditions',
      text: 'CRB helped improve education in the hardest-hit areas by setting up alternative and temporary classrooms to meet the learning needs of affected children, and by providing school bags and essential learning materials to ensure that schooling continues.',
      items: [
        { name: 'School bags &amp; uniforms' },
        { name: 'Temporary schools', note: 'Alternative classrooms' },
        { name: 'Education cash assistance' },
      ],
    }],
    grid: { items: [{ cap: 'Temporary classrooms' }, { cap: 'School bag &amp; uniform distribution event' }] },
  },
  left: {
    blocks: [{
      title: 'Sustainable Education Projects', sub: 'A suitable and lasting school environment',
      text: 'CRB built and rehabilitated schools and equipped them with furniture and learning supplies, improving the quality of education and providing a suitable, sustainable school environment for children in many target areas.',
      items: [
        { name: 'Building &amp; rehabilitating schools' },
        { name: 'School furniture', note: 'Chairs and blackboards' },
        { name: 'Girls’ training center' },
        { name: 'Code project for youth training' },
      ],
    }],
    grid: { items: [{ cap: 'Al-Zubairi Model School' }, { cap: 'From our school projects' }] },
    sdg: { text: 'Quality, inclusive education in a safe environment for affected children.' },
  },
};
