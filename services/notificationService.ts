import { Transaction } from '../types';

const LAST_NOTIFIED_KEY = 'fin_app_last_notification_check';

export const NotificationService = {
  // Solicita permissão ao usuário
  requestPermission: async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.log('Este navegador não suporta notificações.');
      return false;
    }
    
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  },

  // Verifica se tem permissão
  hasPermission: (): boolean => {
    return 'Notification' in window && Notification.permission === 'granted';
  },

  // Envia a notificação
  sendNotification: (title: string, body: string) => {
    if (NotificationService.hasPermission()) {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico', // Fallback icon or app icon
          tag: 'fin_reminder' // Evita spam de notificações iguais empilhadas
        });
        // Atualiza timestamp para não notificar novamente imediatamente
        localStorage.setItem(LAST_NOTIFIED_KEY, Date.now().toString());
      } catch (e) {
        console.error('Erro ao enviar notificação', e);
      }
    }
  },

  // Verifica se deve notificar baseado na última transação
  checkAndNotify: (transactions: Transaction[], intervalHours: number) => {
    if (intervalHours <= 0 || !NotificationService.hasPermission()) return;

    // Encontra a transação mais recente criada (baseado em createdAt ou date)
    const lastTransaction = transactions.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
    
    const now = Date.now();
    let lastActivityTime = 0;

    if (lastTransaction) {
      lastActivityTime = lastTransaction.createdAt || new Date(lastTransaction.date).getTime();
    } else {
      // Se não tem transações, considera a primeira abertura como base, ou ignora
      return; 
    }

    const hoursSinceLastActivity = (now - lastActivityTime) / (1000 * 60 * 60);

    // Verifica se já passou o tempo configurado
    if (hoursSinceLastActivity >= intervalHours) {
      // Verifica se JÁ notificamos recentemente (nas últimas X horas) para não ser chato
      // Vamos assumir que só notificamos 1 vez a cada ciclo do intervalo
      const lastNotifiedStr = localStorage.getItem(LAST_NOTIFIED_KEY);
      const lastNotifiedTime = lastNotifiedStr ? parseInt(lastNotifiedStr) : 0;
      const hoursSinceLastNotification = (now - lastNotifiedTime) / (1000 * 60 * 60);

      // Se passou o tempo limite E não notificamos recentemente (dentro de metade do intervalo)
      if (hoursSinceLastNotification >= (intervalHours / 2)) {
        NotificationService.sendNotification(
          "Hora de atualizar!",
          `Já faz ${Math.floor(hoursSinceLastActivity)}h desde seu último registro. Mantenha suas finanças em dia!`
        );
      }
    }
  }
};