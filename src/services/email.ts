import emailjs from '@emailjs/browser';

// Configuration EmailJS - à remplir avec vos identifiants
// Créer un compte gratuit sur https://www.emailjs.com/
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

// Email du lead qui reçoit les notifications
const LEAD_EMAIL = import.meta.env.VITE_LEAD_EMAIL || '';

export interface OneToOneRequestEmail {
  memberName: string;
  memberRole: string;
  reason?: string;
  urgency: 'low' | 'medium' | 'high';
}

const URGENCY_LABELS = {
  low: 'Pas urgent',
  medium: 'Normal',
  high: 'Urgent',
};

export async function sendOneToOneRequestNotification(request: OneToOneRequestEmail): Promise<boolean> {
  // Vérifier que EmailJS est configuré
  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY || !LEAD_EMAIL) {
    console.warn('EmailJS non configuré. Notification email non envoyée.');
    console.info('Pour activer les notifications email, configurez les variables VITE_EMAILJS_* et VITE_LEAD_EMAIL dans .env');
    return false;
  }

  try {
    const templateParams = {
      to_email: LEAD_EMAIL,
      member_name: request.memberName,
      member_role: request.memberRole,
      reason: request.reason || 'Non précisée',
      urgency: URGENCY_LABELS[request.urgency],
      urgency_level: request.urgency,
    };

    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams,
      EMAILJS_PUBLIC_KEY
    );

    console.log('Notification email envoyée avec succès');
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error);
    return false;
  }
}

export function isEmailConfigured(): boolean {
  return !!(EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY && LEAD_EMAIL);
}
