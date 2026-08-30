import { ActivityType } from '../types';

export const STANDARD_CHURCH_ACTIVITIES: Omit<ActivityType, 'id'>[] = [
  {
    name: 'قداس الجمعة (7:30 صباحاً)',
    defaultPoints: 10,
    requiresApproval: false,
    active: true,
    category: 'liturgy'
  },
  {
    name: 'حصة الألحان الجمعة (1:00 ظهراً)',
    defaultPoints: 10,
    requiresApproval: false,
    active: true,
    category: 'hymns'
  },
  {
    name: 'عشية السبت (6:30 مساءً)',
    defaultPoints: 10,
    requiresApproval: false,
    active: true,
    category: 'liturgy'
  },
  {
    name: 'تسبحة نصف الليل السبت (8:30 مساءً)',
    defaultPoints: 15,
    requiresApproval: false,
    active: true,
    category: 'hymns'
  },
  {
    name: 'قداس الأحد الأسبوعي',
    defaultPoints: 10,
    requiresApproval: false,
    active: true,
    category: 'liturgy'
  },
  {
    name: 'قداس وسط الأسبوع (الأربعاء / الخميس)',
    defaultPoints: 15,
    requiresApproval: true,
    active: true,
    category: 'liturgy'
  },
  {
    name: 'جلسة سر الاعتراف مع أب الاعتراف',
    defaultPoints: 15,
    requiresApproval: true,
    active: true,
    category: 'confession'
  },
  {
    name: 'خدمة ونشاط الخورس الإضافي',
    defaultPoints: 10,
    requiresApproval: true,
    active: true,
    category: 'service'
  }
];
