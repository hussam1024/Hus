'use strict';
/**
 * Permissions catalog. Every API route checks one of these keys server-side.
 *
 * Effective permissions of a user =
 *   (role permissions) ∪ (department permissions) ∪ (user extra grants) − (user denials)
 * The Owner role always has every permission.
 */

const PERMISSIONS = [
  // group, key, label
  ['المشاريع', 'projects.view', 'عرض المشاريع ومراحلها'],
  ['المشاريع', 'projects.create', 'إنشاء مشروع جديد (تسجيل اعتماد المانح)'],
  ['المشاريع', 'projects.edit', 'تعديل بيانات المشروع'],
  ['المشاريع', 'projects.delete', 'حذف مشروع'],

  ['الطلبات', 'requests.view', 'عرض الطلبات الخاصة بإدارته أو المكلّف بها'],
  ['الطلبات', 'requests.view_all', 'عرض جميع الطلبات'],
  ['الطلبات', 'requests.create', 'تسجيل طلب وارد من الجهة المانحة'],

  ['سير العمل', 'workflow.act', 'تنفيذ المراحل الخاصة بإدارته'],
  ['سير العمل', 'workflow.approve', 'اعتماد المراحل التي تتطلب اعتماد المدير العام'],
  ['سير العمل', 'workflow.return', 'إرجاع العمل لتصحيح الأخطاء'],
  ['سير العمل', 'workflow.override', 'تجاوز المراحل وتنفيذها نيابةً عن أي إدارة'],

  ['اللوجستيات', 'logistics.view', 'عرض عروض الأسعار والموردين والعقود'],
  ['اللوجستيات', 'logistics.manage', 'إدارة عروض الأسعار والموردين والعقود والمطالبات'],

  ['المالية', 'finance.view', 'عرض البيانات المالية'],
  ['المالية', 'finance.manage', 'تسجيل الحركات المالية وصرف المستحقات والإقفال'],

  ['الإعلام', 'media.view', 'عرض التغطيات والتوثيقات'],
  ['الإعلام', 'media.manage', 'إدارة التغطيات ورفع التوثيقات'],

  ['السكرتارية', 'secretariat.view', 'عرض سجل الوارد والصادر'],
  ['السكرتارية', 'secretariat.manage', 'إدارة الوارد والصادر والرفع للمانح'],

  ['الرقابة', 'errors.view', 'عرض سجل الأخطاء الشهري'],
  ['الرقابة', 'errors.manage', 'تعديل وإغلاق قيود الأخطاء'],
  ['الرقابة', 'reports.view', 'التقارير ومؤشرات الأداء'],
  ['الرقابة', 'files.view', 'الأرشيف المركزي للمستندات'],

  ['التواصل', 'chat.use', 'المشاركة في ساحة النقاش'],
  ['التواصل', 'chat.manage', 'إنشاء القنوات وتثبيت الرسائل وحذفها'],
  ['التواصل', 'announcements.publish', 'نشر التعميمات الرسمية'],
  ['التواصل', 'meetings.view', 'عرض الاجتماعات والمحاضر'],
  ['التواصل', 'meetings.manage', 'إنشاء الاجتماعات وتدوين المحاضر'],

  ['الموظف', 'tasks.use', 'المهام الشخصية'],
  ['الموظف', 'tasks.assign', 'إسناد المهام للآخرين'],
  ['الموظف', 'leaves.request', 'تقديم طلبات الإجازة'],
  ['الموظف', 'leaves.approve', 'اعتماد طلبات الإجازة'],
  ['الموظف', 'directory.view', 'دليل الموظفين'],

  ['إدارة النظام', 'users.manage', 'إدارة المستخدمين وكلمات المرور'],
  ['إدارة النظام', 'roles.manage', 'إدارة الأدوار ومصفوفة الصلاحيات'],
  ['إدارة النظام', 'departments.manage', 'إدارة الإدارات والأقسام'],
  ['إدارة النظام', 'audit.view', 'سجل التدقيق (من فعل ماذا ومتى)'],
  ['إدارة النظام', 'settings.manage', 'إعدادات النظام والنسخ الاحتياطي'],
];

const ALL_KEYS = PERMISSIONS.map((p) => p[1]);

const BASE_EMPLOYEE = ['chat.use', 'tasks.use', 'leaves.request', 'directory.view', 'meetings.view'];

const DEFAULT_ROLES = [
  {
    key: 'owner', name: 'المضيف الرئيسي', system: 1,
    description: 'صاحب الصلاحية المطلقة على النظام: يُنشئ الحسابات ويوزّع كلمات المرور والصلاحيات.',
    permissions: ALL_KEYS,
  },
  {
    key: 'gm', name: 'المدير العام', system: 1,
    description: 'يطّلع على جميع العمليات (نسخة CC)، ويعتمد المراحل، وينشر التعميمات.',
    permissions: [...BASE_EMPLOYEE, 'projects.view', 'projects.create', 'projects.edit', 'requests.view', 'requests.view_all', 'requests.create',
      'workflow.act', 'workflow.approve', 'workflow.return', 'logistics.view', 'finance.view', 'media.view', 'secretariat.view',
      'errors.view', 'errors.manage', 'reports.view', 'files.view', 'chat.manage', 'announcements.publish', 'meetings.manage',
      'tasks.assign', 'leaves.approve', 'audit.view'],
  },
  {
    key: 'head', name: 'مدير إدارة', system: 0,
    description: 'يدير إدارته، يُسند المهام لفريقه، ويُرجع الأخطاء.',
    permissions: [...BASE_EMPLOYEE, 'workflow.act', 'workflow.return', 'tasks.assign', 'errors.view', 'reports.view', 'meetings.manage', 'files.view'],
  },
  {
    key: 'officer', name: 'موظف', system: 0,
    description: 'ينفّذ المراحل والمهام الخاصة بإدارته.',
    permissions: [...BASE_EMPLOYEE, 'workflow.act'],
  },
  {
    key: 'auditor', name: 'مدقق / مراقب', system: 0,
    description: 'اطلاع فقط على جميع الوحدات دون أي تعديل (للمراجعة الداخلية والجهات الرقابية).',
    permissions: ['projects.view', 'requests.view', 'requests.view_all', 'logistics.view', 'finance.view', 'media.view',
      'secretariat.view', 'errors.view', 'reports.view', 'files.view', 'directory.view', 'meetings.view', 'chat.use', 'audit.view'],
  },
];

const DEFAULT_DEPARTMENTS = [
  {
    key: 'gm', name: 'الإدارة العامة', color: '#0b7a3e', icon: 'crown',
    description: 'المدير العام: يستقبل اعتمادات المشاريع ويعتمد المراحل الرئيسية.',
    permissions: ['projects.view', 'projects.create', 'projects.edit', 'requests.view', 'requests.view_all', 'logistics.view', 'finance.view', 'media.view', 'secretariat.view', 'reports.view', 'files.view', 'errors.view'],
  },
  {
    key: 'secretariat', name: 'سكرتارية الإدارة العامة', color: '#6c4bb4', icon: 'inbox',
    description: 'مسؤول المتابعة والرفع: يستقبل الطلبات، يتابع المهل، ويرفع للجهة المانحة.',
    permissions: ['projects.view', 'requests.view', 'requests.view_all', 'requests.create', 'secretariat.view', 'secretariat.manage', 'media.view', 'errors.view', 'errors.manage', 'files.view', 'reports.view'],
  },
  {
    key: 'projects', name: 'إدارة المشاريع (قطاع المشاريع)', color: '#01a453', icon: 'layers',
    description: 'تتولى تنفيذ المشاريع وخطط التنفيذ والإخلاءات ومراجعة الطلبات.',
    permissions: ['projects.view', 'projects.edit', 'requests.view', 'media.view', 'logistics.view', 'files.view'],
  },
  {
    key: 'logistics', name: 'إدارة اللوجستيات', color: '#d9631a', icon: 'truck',
    description: 'عروض الأسعار، الموردون، العقود، توفير المواد، ومطالبات الموردين.',
    permissions: ['projects.view', 'requests.view', 'logistics.view', 'logistics.manage', 'files.view'],
  },
  {
    key: 'finance', name: 'الإدارة المالية', color: '#1769aa', icon: 'wallet',
    description: 'المخصص الإداري، صرف المستحقات بالشيكات، مراجعة الإخلاءات والإقفال المالي.',
    permissions: ['projects.view', 'requests.view', 'finance.view', 'finance.manage', 'logistics.view', 'files.view'],
  },
  {
    key: 'media', name: 'إدارة الإعلام', color: '#c2185b', icon: 'camera',
    description: 'التغطية الإعلامية في موعد التنفيذ، رفع التوثيقات عبر الرابط المعتمد ومراجعتها.',
    permissions: ['projects.view', 'requests.view', 'media.view', 'media.manage', 'files.view'],
  },
];

function effectivePermissions(user, rolePerms, deptPerms) {
  if (user.role_key === 'owner') return new Set(ALL_KEYS);
  const set = new Set([...(rolePerms || []), ...(deptPerms || [])]);
  for (const p of user.extra_perms || []) set.add(p);
  for (const p of user.denied_perms || []) set.delete(p);
  return set;
}

module.exports = { PERMISSIONS, ALL_KEYS, DEFAULT_ROLES, DEFAULT_DEPARTMENTS, effectivePermissions };
