import { Prisma, PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var prismaSchemaKey: string | undefined;
}

const couponFields =
  Prisma.dmmf.datamodel.models
    .find((model) => model.name === "Coupon")
    ?.fields.map((field) => field.name)
    .join(",") ?? "";

// Recreate the client after `prisma generate` so HMR isn't stuck on a
// pre-migration PrismaClient singleton (e.g. missing appliesTo).
if (global.prismaSchemaKey !== couponFields) {
  void global.prismaGlobal?.$disconnect();
  global.prismaGlobal = new PrismaClient();
  global.prismaSchemaKey = couponFields;
}

const prisma = global.prismaGlobal ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") {
  global.prismaGlobal = prisma;
}

export default prisma;
