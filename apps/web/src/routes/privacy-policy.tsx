import { createFileRoute } from "@tanstack/react-router";

import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";

export const Route = createFileRoute("/privacy-policy")({
  component: PrivacyPolicyPage,
  pendingComponent: LoadingComponent,
});

function PrivacyPolicyPage() {
  return (
    <BorderContainer className="space-y-8">
      <header className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-balance font-bold text-3xl tracking-tight md:text-4xl">
          Política de Privacidad
        </h1>
        <p className="text-muted-foreground text-sm">
          Última actualización: 2 de marzo de 2026
        </p>
      </header>

      <div className="prose prose-neutral dark:prose-invert mx-auto max-w-3xl space-y-6">
        <section className="space-y-3">
          <h2 className="font-semibold text-xl">1. Introducción</h2>
          <p className="text-muted-foreground leading-relaxed">
            La presente Política de Privacidad describe cómo PanaBarbero,
            operada por Andrés Felipe Rodríguez Arias, con domicilio en
            Barrancabermeja, Santander, Colombia, recopila, utiliza, almacena y
            protege la información personal de los usuarios de la plataforma. Al
            usar PanaBarbero, usted acepta las prácticas descritas en esta
            política.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-xl">
            2. Información que Recopilamos
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Recopilamos los siguientes tipos de información:
          </p>

          <h3 className="font-medium text-lg">
            2.1 Información proporcionada directamente
          </h3>
          <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
            <li>
              <strong className="text-foreground">Nombre completo:</strong>{" "}
              Proporcionado durante el registro o a través de su proveedor de
              autenticación (OAuth).
            </li>
            <li>
              <strong className="text-foreground">
                Correo electrónico:
              </strong>{" "}
              Para la creación de cuenta, comunicaciones y notificaciones.
            </li>
            <li>
              <strong className="text-foreground">Número de teléfono:</strong>{" "}
              Para contacto y funcionalidades de la plataforma.
            </li>
            <li>
              <strong className="text-foreground">Imagen de perfil:</strong>{" "}
              Obtenida a través de proveedores de autenticación OAuth (Google,
              etc.) cuando el usuario inicia sesión con dichos servicios.
            </li>
          </ul>

          <h3 className="font-medium text-lg">
            2.2 Información recopilada automáticamente
          </h3>
          <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
            <li>
              <strong className="text-foreground">
                Datos de ubicación:
              </strong>{" "}
              Utilizamos su ubicación para mostrarle barberías cercanas. Esta
              información se procesa en tiempo real y no se almacena de forma
              permanente.
            </li>
            <li>
              <strong className="text-foreground">Datos de uso:</strong>{" "}
              Información sobre cómo interactúa con la plataforma (páginas
              visitadas, funcionalidades utilizadas, tiempo de uso).
            </li>
            <li>
              <strong className="text-foreground">
                Información del dispositivo:
              </strong>{" "}
              Tipo de navegador, sistema operativo y dirección IP.
            </li>
          </ul>

          <h3 className="font-medium text-lg">
            2.3 Información de pago
          </h3>
          <p className="text-muted-foreground leading-relaxed">
            La información de pago (tarjetas de crédito, datos bancarios, etc.)
            es recopilada y procesada exclusivamente por{" "}
            <a
              href="https://polar.sh"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-4"
            >
              Polar
            </a>
            , nuestro proveedor de pagos. PanaBarbero no almacena, procesa ni
            tiene acceso a su información financiera.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-xl">
            3. Uso de la Información
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Utilizamos la información recopilada para:
          </p>
          <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
            <li>Crear y administrar su cuenta en la plataforma.</li>
            <li>
              Permitir la búsqueda de barberías cercanas basada en su ubicación.
            </li>
            <li>Facilitar la reserva y gestión de citas.</li>
            <li>
              Proporcionar a las barberías herramientas de administración y
              gestión.
            </li>
            <li>
              Enviar notificaciones relacionadas con sus citas y actividad en la
              plataforma.
            </li>
            <li>
              Mejorar la plataforma mediante análisis de uso y comportamiento.
            </li>
            <li>Prevenir fraudes y garantizar la seguridad de la plataforma.</li>
            <li>
              Cumplir con obligaciones legales aplicables en Colombia.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-xl">
            4. Herramientas de Analítica
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Utilizamos las siguientes herramientas de analítica para mejorar la
            experiencia del usuario:
          </p>
          <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
            <li>
              <strong className="text-foreground">Vercel Analytics:</strong>{" "}
              Para medir el rendimiento de la plataforma y obtener métricas de
              uso agregadas. Vercel Analytics recopila datos de forma anónima y
              no utiliza cookies.
            </li>
            <li>
              <strong className="text-foreground">PostHog:</strong> Para
              analizar el comportamiento del usuario y mejorar la experiencia de
              la plataforma. PostHog puede recopilar datos de sesión, eventos de
              interacción y datos del dispositivo.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-xl">
            5. Almacenamiento de Datos
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Los datos personales se almacenan en los servidores de{" "}
            <a
              href="https://convex.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-4"
            >
              Convex
            </a>
            , nuestro proveedor de base de datos en la nube. Convex implementa
            medidas de seguridad estándar de la industria, incluyendo cifrado en
            tránsito y en reposo, para proteger su información.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-xl">
            6. Compartición de Datos con Terceros
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            PanaBarbero no vende, alquila ni comparte su información personal
            con terceros con fines comerciales. Solo compartimos información en
            los siguientes casos:
          </p>
          <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
            <li>
              <strong className="text-foreground">
                Proveedores de servicio:
              </strong>{" "}
              Compartimos datos necesarios con nuestros proveedores tecnológicos
              (Convex, Polar, Vercel, PostHog) exclusivamente para la prestación
              del servicio.
            </li>
            <li>
              <strong className="text-foreground">
                Información de citas:
              </strong>{" "}
              Cuando agenda una cita, su nombre y datos de contacto se comparten
              con la barbería correspondiente para la prestación del servicio.
            </li>
            <li>
              <strong className="text-foreground">
                Obligaciones legales:
              </strong>{" "}
              Podemos divulgar información cuando sea requerido por ley,
              regulación, proceso legal o solicitud gubernamental aplicable en
              Colombia.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-xl">
            7. Derechos del Usuario
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            De acuerdo con la Ley 1581 de 2012 (Ley de Protección de Datos
            Personales de Colombia) y sus decretos reglamentarios, usted tiene
            derecho a:
          </p>
          <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
            <li>
              <strong className="text-foreground">Acceso:</strong> Conocer qué
              datos personales tenemos sobre usted.
            </li>
            <li>
              <strong className="text-foreground">Actualización:</strong>{" "}
              Rectificar sus datos cuando sean inexactos o estén incompletos.
            </li>
            <li>
              <strong className="text-foreground">Supresión:</strong> Solicitar
              la eliminación de sus datos cuando considere que no están siendo
              tratados conforme a la ley.
            </li>
            <li>
              <strong className="text-foreground">Revocación:</strong> Revocar
              la autorización otorgada para el tratamiento de sus datos.
            </li>
            <li>
              <strong className="text-foreground">Portabilidad:</strong>{" "}
              Solicitar una copia de sus datos en un formato legible.
            </li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            Para ejercer cualquiera de estos derechos, puede contactarnos a
            través del correo electrónico indicado en la sección de Contacto.
            Responderemos a su solicitud dentro de los plazos establecidos por la
            ley colombiana.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-xl">
            8. Seguridad de los Datos
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Implementamos medidas de seguridad técnicas y organizativas para
            proteger su información personal contra acceso no autorizado,
            alteración, divulgación o destrucción. Estas medidas incluyen:
          </p>
          <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
            <li>Cifrado de datos en tránsito mediante HTTPS/TLS.</li>
            <li>Cifrado de datos en reposo en nuestra base de datos.</li>
            <li>
              Autenticación segura con soporte de proveedores OAuth.
            </li>
            <li>Acceso restringido a datos personales por parte del equipo.</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            Sin embargo, ningún método de transmisión por Internet o
            almacenamiento electrónico es 100% seguro. Aunque nos esforzamos por
            proteger su información, no podemos garantizar seguridad absoluta.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-xl">
            9. Retención de Datos
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Conservamos su información personal mientras su cuenta esté activa o
            mientras sea necesario para proporcionarle los servicios. Si elimina
            su cuenta, procederemos a eliminar sus datos personales dentro de un
            plazo razonable, salvo que la ley colombiana nos obligue a
            conservarlos por un período determinado.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-xl">
            10. Menores de Edad
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            PanaBarbero está dirigida a personas mayores de 13 años. Los menores
            entre 13 y 17 años deben contar con el consentimiento de su padre,
            madre o tutor legal para utilizar la plataforma. No recopilamos
            intencionalmente datos de menores de 13 años. Si detectamos que
            hemos recopilado datos de un menor de 13 años, procederemos a
            eliminarlos de inmediato.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-xl">
            11. Cambios a esta Política
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Nos reservamos el derecho de actualizar esta Política de Privacidad
            en cualquier momento. Los cambios serán notificados a través de la
            plataforma o por correo electrónico. La fecha de la última
            actualización se reflejará al inicio de este documento. El uso
            continuado de la plataforma después de la publicación de cambios
            constituye la aceptación de la política actualizada.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-xl">
            12. Ley Aplicable
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Esta Política de Privacidad se rige por la Ley 1581 de 2012 (Ley de
            Protección de Datos Personales), el Decreto 1377 de 2013 y demás
            normativa aplicable en la República de Colombia. Para cualquier
            disputa relacionada con el tratamiento de sus datos personales, serán
            competentes los tribunales de Barrancabermeja, Santander, Colombia.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-xl">13. Contacto</h2>
          <p className="text-muted-foreground leading-relaxed">
            Si tiene preguntas, inquietudes o desea ejercer sus derechos sobre
            sus datos personales, puede contactarnos a través de:
          </p>
          <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
            <li>
              <strong className="text-foreground">Responsable:</strong> Andrés
              Felipe Rodríguez Arias
            </li>
            <li>
              <strong className="text-foreground">Correo electrónico:</strong>{" "}
              <a
                href="mailto:roariasaf@gmail.com"
                className="text-primary underline underline-offset-4"
              >
                roariasaf@gmail.com
              </a>
            </li>
            <li>
              <strong className="text-foreground">Ubicación:</strong>{" "}
              Barrancabermeja, Santander, Colombia
            </li>
          </ul>
        </section>
      </div>
    </BorderContainer>
  );
}
