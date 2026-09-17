/**
 * Remove transfers created by ad-hoc API testing, so the demo data set stays
 * readable. Matches on recipient name only — it never touches anything else.
 *
 * Run: npx tsx scripts/cleanup-test-data.ts
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const TEST_NAMES = ['Dup Test', 'Dup Test 2'];

async function main() {
  const targets = await db.transfer.findMany({
    where: { recipientName: { in: TEST_NAMES } },
    select: { id: true, reference: true, recipientName: true },
  });

  if (targets.length === 0) {
    console.log('Nothing to clean up.');
    return;
  }

  for (const t of targets) {
    // Children first: audit and provider events do not cascade.
    await db.auditEvent.deleteMany({ where: { transferId: t.id } });
    await db.providerEvent.deleteMany({ where: { transferId: t.id } });
    await db.transfer.delete({ where: { id: t.id } });
    console.log(`Removed ${t.reference} (${t.recipientName})`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
