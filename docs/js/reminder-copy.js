// Textes des rappels de compléments, partagés entre l'app et le service worker.
// Trois paliers : chaque rappel est un peu plus pressant que le précédent.
self.reminderHours = [16, 18, 20];

self.reminderTier = function reminderTier(hour) {
  return hour >= 20 ? 3 : hour >= 18 ? 2 : hour >= 16 ? 1 : 0;
};

self.reminderList = function reminderList(names) {
  if (!names || !names.length) return 'Tes compléments';
  if (names.length === 1) return names[0];
  if (names.length <= 3) return `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]}`;
  return `${names.slice(0, 2).join(', ')} et ${names.length - 2} autres`;
};

self.reminderCopy = function reminderCopy(tier, names, streak) {
  const list = self.reminderList(names);
  if (tier >= 3) {
    return {
      title: "Dernier rappel : c'est maintenant !",
      body: streak > 1
        ? `${list}. Ta série de ${streak} jours saute si tu ne les prends pas ce soir.`
        : `${list}. Dernière chance aujourd'hui : pose tout et prends-les.`,
      vibrate: [300, 100, 300, 100, 500],
    };
  }
  if (tier === 2) {
    return {
      title: 'Toujours rien à 18 h',
      body: `${list}. Ne laisse pas filer la journée, c'est le moment.`,
      vibrate: [200, 100, 200],
    };
  }
  return {
    title: "Tes compléments t'attendent",
    body: `${list} à prendre. Deux secondes et c'est réglé.`,
    vibrate: [100],
  };
};
