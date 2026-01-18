const errorMessages = {
  USER_NOT_FOUND: "Usuario no encontrado",
  FAILED_TO_CREATE_USER: "Error al crear el usuario",
  FAILED_TO_CREATE_SESSION: "Error al crear la sesión",
  FAILED_TO_UPDATE_USER: "Error al actualizar el usuario",
  FAILED_TO_GET_SESSION: "Error al obtener la sesión",
  INVALID_PASSWORD: "Contraseña incorrecta",
  INVALID_EMAIL: "Correo electrónico inválido",
  INVALID_EMAIL_OR_PASSWORD: "Correo electrónico o contraseña inválidos",
  SOCIAL_ACCOUNT_ALREADY_LINKED: "Cuenta ya vinculada",
  PROVIDER_NOT_FOUND: "Proveedor no encontrado",
  INVALID_TOKEN: "Token inválido",
  ID_TOKEN_NOT_SUPPORTED: "Token de identificación no soportado",
  FAILED_TO_GET_USER_INFO: "Error al obtener la información del usuario",
  USER_EMAIL_NOT_FOUND: "Correo electrónico del usuario no encontrado",
  EMAIL_NOT_VERIFIED:
    "Debes verificar tu correo electrónico para iniciar sesión.",
  PASSWORD_TOO_SHORT: "Contraseña demasiado corta",
  PASSWORD_TOO_LONG: "Contraseña demasiado larga",
  USER_ALREADY_EXISTS: "El usuario ya existe",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
    "El usuario ya existe. Use otro correo electrónico",
  EMAIL_CAN_NOT_BE_UPDATED: "El correo electrónico no puede ser actualizado",
  CREDENTIAL_ACCOUNT_NOT_FOUND: "Cuenta de credencial no encontrada",
  SESSION_EXPIRED: "Sesión expirada. Inicia sesión nuevamente para continuar",
  FAILED_TO_UNLINK_LAST_ACCOUNT: "No puedes desvincular tu última cuenta",
  ACCOUNT_NOT_FOUND: "Cuenta no encontrada",
  USER_ALREADY_HAS_PASSWORD:
    "Usuario ya tiene una contraseña. Proporciona esa contraseña para eliminar la cuenta.",
  INVALID_TWO_FACTOR_COOKIE: "Código de verificación inválido",
};

export const translateBetterAuthError = (errorCode: string) => {
  return errorMessages[errorCode as keyof typeof errorMessages];
};
