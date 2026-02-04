export const handleApiError = (error: any, fallbackMessage: string = "🏮 Ocurrió un error inesperado.") => {
  console.error("API Error:", error);
  
  if (error instanceof Error) {
    if (error.message.includes("Failed to fetch")) {
      return "🏮 Error de conexión. Por favor verifica tu internet.";
    }
    return `🏮 ${error.message}`;
  }
  
  return fallbackMessage;
};

export const formatChefNotification = (message: string) => {
  if (message.includes("Workflow execution failed")) {
    return "🏮 Lo sentimos, hubo un problema técnico en la cocina. Por favor, intenta de nuevo.";
  }
  return message;
};
