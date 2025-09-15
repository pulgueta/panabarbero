"use client";

import type { Barbershop } from "@panabarbero/db/schema/zod";
import { Suspense } from "react";

import { BarbershopPageCard } from "@/components/barbershops/barbershop-card";
import { Container } from "@/components/ui/container";

const mockBarbershops = [
  {
    uuid: "1",
    name: "Eduardo Barber Shop",
    description: "Barbershop 1 description",
    organizationId: "1",
    address: "Calle 123, Ciudad, País",
    contactPhone: "1234567890",
    socialMedia: [
      {
        platform: "instagram",
        url: "https://www.instagram.com/barbershop1",
      },
      {
        platform: "facebook",
        url: "https://www.facebook.com/barbershop1",
      },
      {
        platform: "twitter",
        url: "https://www.twitter.com/barbershop1",
      },
    ],
    isActive: true,
    gracePeriodMinutes: 5,
    city: "San Sebastian de Buenavista",
    state: "Magdalena",
    zipCode: "1234567890",
    bannerUrl: "Barbershop 1 bannerUrl",
    contactEmail: "Barbershop 1 contactEmail",
    websiteUrl: "Barbershop 1 websiteUrl",
    ownerId: "1",
    availableDays: {
      monday: {
        open: "09:00",
        close: "18:00",
      },
      tuesday: {
        open: "09:00",
        close: "18:00",
      },
      wednesday: {
        open: "09:00",
        close: "18:00",
      },
      thursday: {
        open: "09:00",
        close: "18:00",
      },
      friday: {
        open: "09:00",
        close: "18:00",
      },
      saturday: {
        open: "09:00",
        close: "18:00",
      },
      sunday: {
        open: "09:00",
        close: "18:00",
      },
    },
    coordinates: {
      x: 7.068980576756957,
      y: -73.85886551722182,
    },
  },
  {
    uuid: "2",
    name: "Barbershop 2",
    description: "Barbershop 2 description",
    organizationId: "1",
    address: "Barbershop 2 address",
    contactPhone: "1234567890",
    socialMedia: [],
    isActive: true,
    gracePeriodMinutes: 5,
    city: "Barrancabermeja",
    state: "Santander",
    zipCode: "1234567890",
    bannerUrl: "Barbershop 2 bannerUrl",
    contactEmail: "Barbershop 2 contactEmail",
    websiteUrl: "Barbershop 2 websiteUrl",
    ownerId: "1",
    availableDays: {
      monday: {
        open: "09:00",
        close: "18:00",
      },
      tuesday: {
        open: "09:00",
        close: "18:00",
      },
      wednesday: {
        open: "09:00",
        close: "18:00",
      },
      thursday: {
        open: "09:00",
        close: "18:00",
      },
      friday: {
        open: "09:00",
        close: "18:00",
      },
      saturday: {
        open: "09:00",
        close: "18:00",
      },
      sunday: {
        open: "09:00",
        close: "18:00",
      },
    },
    coordinates: {
      x: 7.064229493745078,
      y: -73.85622069123868,
    },
  },
  {
    uuid: "3",
    name: "Barbershop 2",
    description: "Barbershop 2 description",
    organizationId: "1",
    address: "Barbershop 2 address",
    contactPhone: "1234567890",
    socialMedia: [],
    isActive: true,
    gracePeriodMinutes: 5,
    city: "Barrancabermeja",
    state: "Santander",
    zipCode: "1234567890",
    bannerUrl: "Barbershop 2 bannerUrl",
    contactEmail: "Barbershop 2 contactEmail",
    websiteUrl: "Barbershop 2 websiteUrl",
    ownerId: "1",
    availableDays: {
      monday: {
        open: "09:00",
        close: "18:00",
      },
      tuesday: {
        open: "09:00",
        close: "18:00",
      },
      wednesday: {
        open: "09:00",
        close: "18:00",
      },
      thursday: {
        open: "09:00",
        close: "18:00",
      },
      friday: {
        open: "09:00",
        close: "18:00",
      },
      saturday: {
        open: "09:00",
        close: "18:00",
      },
      sunday: {
        open: "09:00",
        close: "18:00",
      },
    },
    coordinates: {
      x: 0,
      y: 0,
    },
  },
] satisfies Barbershop[];

const Barbershops = () => {
  return (
    <Container fullWidth fullHeight className="p-4">
      <Suspense fallback={<div>Cargando barberias...</div>}>
        <Container
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
          variant="xl"
        >
          {mockBarbershops.map((barbershop) => (
            <BarbershopPageCard key={barbershop.uuid} barbershop={barbershop} />
          ))}
        </Container>
      </Suspense>
    </Container>
  );
};
export default Barbershops;
