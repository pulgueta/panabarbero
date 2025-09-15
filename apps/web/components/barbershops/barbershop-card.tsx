"use client";

import { getStateCode } from "@panabarbero/client/utils";
import type { Barbershop } from "@panabarbero/db/schema/zod";
import {
  APIProvider,
  Map as GoogleMap,
  Marker,
} from "@vis.gl/react-google-maps";
import { MapPin } from "lucide-react";
import Link from "next/link";
import type { FC } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { clientEnv } from "@/env/client";

type BarbershopPageCardProps = {
  barbershop: Omit<Barbershop, "id" | "createdAt" | "updatedAt">;
};

export const BarbershopPageCard: FC<BarbershopPageCardProps> = ({
  barbershop,
}) => {
  return (
    <Card className="min-h-48 w-full justify-between">
      <CardHeader>
        <Container className="mb-1">
          <CardTitle className="flex w-full items-center justify-between gap-4 text-xl">
            {barbershop.name}

            {barbershop.logo ? (
              <Avatar>
                <AvatarImage src={barbershop.logo} />
                <AvatarFallback className="text-sm">
                  {barbershop.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <Avatar>
                <AvatarFallback className="text-sm">
                  {barbershop.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            )}
          </CardTitle>
          <CardDescription>{barbershop.address}</CardDescription>
        </Container>

        {barbershop.coordinates ? (
          <Popover>
            <PopoverTrigger asChild>
              <CardDescription className="text-xs hover:cursor-pointer hover:underline hover:underline-offset-4">
                <MapPin className="size-4" />
                {barbershop.city}, {getStateCode(barbershop.state)}
              </CardDescription>
            </PopoverTrigger>
            <PopoverContent className="w-full max-w-96 space-y-2 rounded">
              <APIProvider apiKey={clientEnv.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}>
                <GoogleMap
                  style={{
                    width: "300px",
                    height: "200px",
                    borderRadius: "8px",
                  }}
                  defaultCenter={{
                    lat: barbershop.coordinates.x,
                    lng: barbershop.coordinates.y,
                  }}
                  defaultZoom={18}
                  gestureHandling="none"
                  disableDefaultUI
                >
                  <Marker
                    position={{
                      lat: barbershop.coordinates.x,
                      lng: barbershop.coordinates.y,
                    }}
                  />
                </GoogleMap>
              </APIProvider>
            </PopoverContent>
          </Popover>
        ) : (
          <CardDescription className="text-xs">
            <MapPin className="size-4" />
            {barbershop.city}, {getStateCode(barbershop.state)}
          </CardDescription>
        )}
      </CardHeader>

      <CardFooter>
        <Button className="w-1/2" variant="outline" asChild>
          <Link href={`/barbershops/${barbershop.uuid}`}>Ver más</Link>
        </Button>
        <Button className="w-1/2">Reservar</Button>
      </CardFooter>
    </Card>
  );
};
