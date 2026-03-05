import { createFileRoute } from "@tanstack/react-router";

import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";

export const Route = createFileRoute("/tos")({
  component: TermsOfServicePage,
  pendingComponent: LoadingComponent,
});

function TermsOfServicePage() {
  return (
    <BorderContainer className="space-y-8">
      <header className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-balance font-bold text-3xl tracking-tight md:text-4xl">
          Términos de Servicio
        </h1>
        <p className="text-muted-foreground text-sm">
          Última actualización: 2 de marzo de 2026
        </p>
      </header>

      <div className="prose prose-neutral dark:prose-invert mx-auto max-w-3xl space-y-6">
        <section className="space-y-3">
          <h2 className="font-semibold text-xl">1. Introducción</h2>
          <p className="text-muted-foreground leading-relaxed">
            Bienvenido a PanaBarbero. Estos Términos de Servicio
            (&quot;Términos&quot;) regulan el acceso y uso de la plataforma
            PanaBarbero, operada por Andrés Felipe Rodríguez Arias, con
            domicilio en Barrancabermeja, Santander, Colombia. Al acceder o
            utilizar la plataforma, usted acepta estos Términos en su totalidad.
            Si no está de acuerdo con alguno de estos Términos, debe abstenerse
            de usar la plataforma.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-xl">2. Descripción del Servicio</h2>
          <p className="text-muted-foreground leading-relaxed">
            PanaBarbero es un marketplace que conecta a usuarios con barberías
            locales, permitiendo a los usuarios buscar barberías y agendar
            servicios. Para las barberías, PanaBarbero ofrece una plataforma
            SaaS (Software como Servicio) que les permite gestionar su negocio y
            ofrecer sus servicios a los usuarios de la plataforma.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-xl">3. Elegibilidad</h2>
          <p className="text-muted-foreground leading-relaxed">
            Para usar PanaBarbero, debe tener al menos 13 años de edad. Si es
            menor de 18 años, declara que cuenta con el consentimiento de su
            padre, madre o tutor legal para usar la plataforma. Nos reservamos
            el derecho de solicitar verificación de edad en cualquier momento.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-xl">4. Tipos de Cuenta</h2>
          <p className="text-muted-foreground leading-relaxed">
            PanaBarbero ofrece dos tipos de cuenta:
          </p>
          <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
            <li>
              <strong className="text-foreground">Usuario:</strong> Puede buscar
              barberías, ver servicios disponibles y agendar citas.
            </li>
            <li>
              <strong className="text-foreground">Barbería:</strong> Puede crear
              y gestionar un perfil de barbería, publicar servicios, gestionar
              citas y acceder a funcionalidades SaaS de administración.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-xl">5. Registro de Cuenta</h2>
          <p className="text-muted-foreground leading-relaxed">
            Para acceder a ciertas funcionalidades, deberá crear una cuenta
            proporcionando información veraz, completa y actualizada. Usted es
            responsable de mantener la confidencialidad de sus credenciales de
            acceso y de todas las actividades que ocurran bajo su cuenta. Debe
            notificarnos de inmediato ante cualquier uso no autorizado de su
            cuenta.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-xl">6. Pagos y Suscripciones</h2>
          <p className="text-muted-foreground leading-relaxed">
            PanaBarbero ofrece funcionalidades de pago para barberías a través
            de planes de suscripción. Los pagos son procesados por nuestro
            proveedor externo{" "}
            <a
              href="https://polar.sh"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-4"
            >
              Polar
            </a>
            . Al suscribirse a un plan de pago, usted acepta:
          </p>
          <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
            <li>
              Proporcionar información de pago válida y actualizada a Polar.
            </li>
            <li>
              Que los cargos se realizarán de forma recurrente según el ciclo de
              facturación seleccionado.
            </li>
            <li>
              Que puede cancelar su suscripción en cualquier momento. La
              cancelación será efectiva al final del período de facturación
              vigente.
            </li>
            <li>
              Que los precios pueden cambiar con previo aviso de al menos 30
              días.
            </li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            La información de pago (tarjetas de crédito, datos bancarios, etc.)
            es gestionada exclusivamente por Polar. PanaBarbero no almacena
            información financiera en sus servidores.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-xl">7. Uso Aceptable</h2>
          <p className="text-muted-foreground leading-relaxed">
            Al usar PanaBarbero, usted se compromete a:
          </p>
          <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
            <li>
              No utilizar la plataforma para fines ilegales o no autorizados.
            </li>
            <li>
              No intentar acceder a cuentas de otros usuarios sin autorización.
            </li>
            <li>
              No publicar contenido falso, engañoso, difamatorio u ofensivo.
            </li>
            <li>
              No interferir con el funcionamiento normal de la plataforma.
            </li>
            <li>
              No realizar ingeniería inversa, descompilar o intentar extraer el
              código fuente de la plataforma.
            </li>
            <li>
              No utilizar bots, scrapers o herramientas automatizadas para
              acceder a la plataforma sin autorización expresa.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-xl">8. Contenido del Usuario</h2>
          <p className="text-muted-foreground leading-relaxed">
            Los usuarios y barberías pueden publicar contenido en la plataforma
            (fotos, descripciones, reseñas, etc.). Usted conserva la propiedad
            de su contenido, pero al publicarlo otorga a PanaBarbero una
            licencia no exclusiva, mundial, libre de regalías para usar,
            mostrar, reproducir y distribuir dicho contenido en la plataforma
            con el fin de prestar el servicio.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Nos reservamos el derecho de eliminar cualquier contenido que viole
            estos Términos o que consideremos inapropiado, sin previo aviso.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-xl">9. Propiedad Intelectual</h2>
          <p className="text-muted-foreground leading-relaxed">
            La plataforma PanaBarbero, incluyendo su diseño, código, logotipos,
            marcas y todo el contenido original, es propiedad de Andrés Felipe
            Rodríguez Arias. Queda prohibida la reproducción, distribución o
            modificación total o parcial de la plataforma sin autorización
            expresa y por escrito.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-xl">
            10. Limitación de Responsabilidad
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            PanaBarbero actúa como intermediario entre usuarios y barberías. En
            consecuencia:
          </p>
          <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
            <li>
              No somos responsables de la calidad de los servicios prestados por
              las barberías.
            </li>
            <li>
              No garantizamos la disponibilidad ininterrumpida de la plataforma.
            </li>
            <li>
              No seremos responsables por daños indirectos, incidentales,
              especiales o consecuentes derivados del uso de la plataforma.
            </li>
            <li>
              Nuestra responsabilidad total en cualquier caso no excederá el
              monto pagado por el usuario en los últimos 12 meses.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-xl">
            11. Suspensión y Terminación
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Nos reservamos el derecho de suspender o cancelar su cuenta en
            cualquier momento si:
          </p>
          <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
            <li>Viola estos Términos de Servicio.</li>
            <li>
              Proporciona información falsa o engañosa durante el registro.
            </li>
            <li>
              Realiza actividades que perjudiquen a otros usuarios o a la
              plataforma.
            </li>
            <li>No cumple con las obligaciones de pago aplicables.</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            Usted puede eliminar su cuenta en cualquier momento desde la
            configuración de su perfil.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-xl">
            12. Modificaciones a los Términos
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Nos reservamos el derecho de modificar estos Términos en cualquier
            momento. Los cambios serán notificados a través de la plataforma o
            por correo electrónico. El uso continuado de la plataforma después
            de la notificación de cambios constituye la aceptación de los nuevos
            Términos.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-xl">
            13. Ley Aplicable y Jurisdicción
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Estos Términos se rigen por las leyes de la República de Colombia.
            Cualquier disputa que surja en relación con estos Términos será
            sometida a la jurisdicción de los tribunales competentes de
            Barrancabermeja, Santander, Colombia.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-xl">14. Contacto</h2>
          <p className="text-muted-foreground leading-relaxed">
            Si tiene preguntas o inquietudes sobre estos Términos de Servicio,
            puede contactarnos a través de:
          </p>
          <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
            <li>
              Correo electrónico:{" "}
              <a
                href="mailto:roariasaf@gmail.com"
                className="text-primary underline underline-offset-4"
              >
                roariasaf@gmail.com
              </a>
            </li>
          </ul>
        </section>
      </div>
    </BorderContainer>
  );
}
