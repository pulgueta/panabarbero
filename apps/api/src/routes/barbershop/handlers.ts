import { STATUS_CODES } from "@panabarbero/constants";

import type { ApiHandler } from "@/config/types";
import type { CreateRoute } from "./routes";

export const createBarbershop: ApiHandler<CreateRoute> = async (c) => {
  const barbershop = c.req.valid("json");
  const { address, city, state, zip } = barbershop;

  const mockedBarbershop = {
    id: "1",
    name: "Barbershop 1",
    address,
    city,
    state,
    zip,
  };

  return c.json(mockedBarbershop, STATUS_CODES.CREATED);
};
