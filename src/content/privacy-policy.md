# Política de Privacidad

_Última actualización: 20 de junio de 2026_

## 1. Introducción

La presente Política de Privacidad describe cómo PanaBarbero, operada por Andrés Felipe Rodríguez Arias, con domicilio en Barrancabermeja, Santander, Colombia, recopila, utiliza, almacena y protege la información personal de los usuarios de la plataforma. Al usar PanaBarbero, usted acepta las prácticas descritas en esta política.

## 2. Información que Recopilamos

Recopilamos los siguientes tipos de información:

### 2.1 Información proporcionada directamente

- **Nombre completo:** Proporcionado durante el registro o transmitido por su proveedor de autenticación OAuth (por ejemplo, Google) a través de WorkOS AuthKit.
- **Correo electrónico:** Para la creación de cuenta, comunicaciones y notificaciones. Es recopilado y gestionado por WorkOS en el momento del registro.
- **Número de teléfono:** Para contacto y funcionalidades de la plataforma.
- **Imagen de perfil:** Obtenida desde su proveedor OAuth (Google, etc.) a través de WorkOS AuthKit cuando inicia sesión con dichos servicios.

### 2.2 Información recopilada automáticamente

- **Datos de ubicación:** Con su autorización expresa, accedemos a la ubicación de su dispositivo a través del permiso de geolocalización de su navegador para mostrarle barberías cercanas. El acceso a la ubicación es opcional y solo se solicita cuando usted lo activa; en todo momento puede elegir su ciudad manualmente. Para convertir las coordenadas en un departamento y ciudad, enviamos las coordenadas a un servicio externo de geocodificación inversa ([BigDataCloud](https://www.bigdatacloud.com)). Esta información se procesa de forma transitoria para resolver su ubicación aproximada y no se almacena de forma permanente en nuestros servidores.
- **Datos de uso:** Información sobre cómo interactúa con la plataforma (páginas visitadas, funcionalidades utilizadas, tiempo de uso).
- **Información del dispositivo:** Tipo de navegador, sistema operativo y dirección IP.

### 2.3 Información de autenticación

El proceso de registro, inicio de sesión y gestión de sesiones es gestionado exclusivamente por [WorkOS AuthKit](https://workos.com), nuestro proveedor de identidad. WorkOS recopila y almacena las credenciales de acceso (contraseñas cifradas), tokens de sesión y los datos de identidad provenientes de proveedores OAuth. PanaBarbero no almacena contraseñas ni tokens de autenticación en sus propios servidores; únicamente recibe un identificador de usuario y los datos de perfil básicos (nombre, correo electrónico, imagen) que WorkOS nos transmite de forma segura.

### 2.4 Información de pago

La información de pago (tarjetas de crédito, datos bancarios, etc.) es recopilada y procesada exclusivamente por [Polar](https://polar.sh), nuestro proveedor de pagos. PanaBarbero no almacena, procesa ni tiene acceso a su información financiera.

## 3. Uso de la Información

Utilizamos la información recopilada para:

- Crear y administrar su cuenta en la plataforma.
- Permitir la búsqueda de barberías cercanas basada en su ubicación.
- Facilitar la reserva y gestión de citas.
- Proporcionar a las barberías herramientas de administración y gestión.
- Enviar notificaciones relacionadas con sus citas y actividad en la plataforma.
- Moderar el contenido de las reseñas. El contenido de las reseñas (calificación y comentario) se procesa mediante un sistema automatizado de moderación con inteligencia artificial para detectar lenguaje de odio, difamación o desinformación, a través de un proveedor de IA ([Vercel AI Gateway](https://vercel.com)).
- Mejorar la plataforma mediante análisis de uso y comportamiento.
- Prevenir fraudes y garantizar la seguridad de la plataforma.
- Cumplir con obligaciones legales aplicables en Colombia.

## 4. Herramientas de Analítica

Utilizamos únicamente **Cloudflare Web Analytics** para medir el rendimiento de la plataforma y obtener métricas de uso agregadas. Cloudflare Web Analytics recopila datos de forma anónima, no utiliza cookies ni identificadores de seguimiento basados en terceros y está diseñada para respetar la privacidad de los usuarios.

## 5. Almacenamiento de Datos

Los datos de identidad (credenciales, sesiones, membresías de organización) se almacenan en los servidores de [WorkOS](https://workos.com), nuestro proveedor de autenticación. Los datos de la aplicación (perfil, citas, barberías, servicios) se almacenan en los servidores de [Convex](https://convex.dev), nuestro proveedor de base de datos en la nube. Ambos proveedores implementan medidas de seguridad estándar de la industria, incluyendo cifrado en tránsito y en reposo.

## 6. Compartición de Datos con Terceros

PanaBarbero no vende, alquila ni comparte su información personal con terceros con fines comerciales. Solo compartimos información en los siguientes casos:

- **Proveedores de servicio:** Compartimos datos necesarios con nuestros proveedores tecnológicos (WorkOS, Convex, Polar, Vercel) exclusivamente para la prestación del servicio. En particular, WorkOS recibe sus datos de identidad para gestionar la autenticación; Convex almacena los datos de aplicación; Polar procesa la información de suscripción.
- **Información de citas:** Cuando agenda una cita, su nombre y datos de contacto se comparten con la barbería correspondiente para la prestación del servicio.
- **Obligaciones legales:** Podemos divulgar información cuando sea requerido por ley, regulación, proceso legal o solicitud gubernamental aplicable en Colombia.

## 7. Derechos del Usuario

De acuerdo con la Ley 1581 de 2012 (Ley de Protección de Datos Personales de Colombia) y sus decretos reglamentarios, usted tiene derecho a:

- **Acceso:** Conocer qué datos personales tenemos sobre usted.
- **Actualización:** Rectificar sus datos cuando sean inexactos o estén incompletos.
- **Supresión:** Solicitar la eliminación de sus datos cuando considere que no están siendo tratados conforme a la ley.
- **Revocación:** Revocar la autorización otorgada para el tratamiento de sus datos.
- **Portabilidad:** Solicitar una copia de sus datos en un formato legible.

Para ejercer cualquiera de estos derechos, puede contactarnos a través del correo electrónico indicado en la sección de Contacto. Responderemos a su solicitud dentro de los plazos establecidos por la ley colombiana.

## 8. Seguridad de los Datos

Implementamos medidas de seguridad técnicas y organizativas para proteger su información personal contra acceso no autorizado, alteración, divulgación o destrucción. Estas medidas incluyen:

- Cifrado de datos en tránsito mediante HTTPS/TLS.
- Cifrado de datos en reposo en nuestra base de datos.
- Autenticación segura gestionada por WorkOS AuthKit, con soporte de proveedores OAuth y almacenamiento de credenciales cifradas fuera de nuestros servidores.
- Acceso restringido a datos personales por parte del equipo.

Sin embargo, ningún método de transmisión por Internet o almacenamiento electrónico es 100% seguro. Aunque nos esforzamos por proteger su información, no podemos garantizar seguridad absoluta.

## 9. Retención de Datos y Eliminación de Cuenta

Conservamos su información personal mientras su cuenta esté activa o mientras sea necesario para proporcionarle los servicios.

**Al eliminar su cuenta**, los siguientes datos son eliminados de forma inmediata e irreversible:

- Su perfil de usuario (nombre, correo electrónico, teléfono e imagen).
- Sus reseñas publicadas en la plataforma.
- Sus notificaciones dentro de la aplicación.
- Si es **propietario de una barbería**: la barbería completa con todos sus servicios, citas, membresías del equipo, metadatos y registros financieros asociados.
- Si es **miembro del equipo**: su membresía y las asignaciones de servicio correspondientes.

**Datos que pueden ser retenidos:**

- Los registros de citas en las que usted participó como cliente en barberías de terceros pueden ser conservados por dichas barberías con fines operativos y de historial. Estos registros contienen únicamente la información de contacto que usted proporcionó al momento de agendar (nombre, teléfono, correo electrónico) y no están vinculados a su cuenta una vez eliminada.

Lo anterior aplica salvo que la ley colombiana nos obligue a conservar ciertos datos por un período determinado.

## 10. Menores de Edad

PanaBarbero está dirigida a personas mayores de 13 años. Los menores entre 13 y 17 años deben contar con el consentimiento de su padre, madre o tutor legal para utilizar la plataforma. No recopilamos intencionalmente datos de menores de 13 años. Si detectamos que hemos recopilado datos de un menor de 13 años, procederemos a eliminarlos de inmediato.

## 11. Cambios a esta Política

Nos reservamos el derecho de actualizar esta Política de Privacidad en cualquier momento. Los cambios serán notificados a través de la plataforma o por correo electrónico. La fecha de la última actualización se reflejará al inicio de este documento. El uso continuado de la plataforma después de la publicación de cambios constituye la aceptación de la política actualizada.

## 12. Ley Aplicable

Esta Política de Privacidad se rige por la Ley 1581 de 2012 (Ley de Protección de Datos Personales), el Decreto 1377 de 2013 y demás normativa aplicable en la República de Colombia. Para cualquier disputa relacionada con el tratamiento de sus datos personales, serán competentes los tribunales de Barrancabermeja, Santander, Colombia.

## 13. Contacto

Si tiene preguntas, inquietudes o desea ejercer sus derechos sobre sus datos personales, puede contactarnos a través de:

- **Responsable:** Andrés Felipe Rodríguez Arias
- **Correo electrónico:** [roariasaf@gmail.com](mailto:roariasaf@gmail.com)
- **Ubicación:** Barrancabermeja, Santander, Colombia
