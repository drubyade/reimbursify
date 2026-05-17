import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const forms = await prisma.formTemplate.findMany();
  for (const form of forms) {
    if (typeof form.templateSchema === 'string') {
        const schema = JSON.parse(form.templateSchema);
        console.log(`Form: ${form.title}`);
        for (const section of schema.sections || []) {
            for (const field of section.fields || []) {
                if (field.type.includes("yes") || field.type.includes("no") || field.type.includes("bool")) {
                    console.log(`- Field: ${field.label}, Type: ${field.type}`);
                }
            }
        }
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
