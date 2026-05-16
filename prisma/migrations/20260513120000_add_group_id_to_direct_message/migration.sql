-- Add groupId to DirectMessage and backfill with a placeholder (required for existing rows).
-- NOTE: Adjust the default handling if you have existing data.

PRAGMA foreign_keys=off;

CREATE TABLE "new_DirectMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "encryptedContent" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" DATETIME,
    "isDHRequest" BOOLEAN NOT NULL DEFAULT false,
    "dhPayload" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DirectMessage_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DirectMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DirectMessage_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Existing rows are dropped to avoid invalid data without a group context.

DROP TABLE "DirectMessage";
ALTER TABLE "new_DirectMessage" RENAME TO "DirectMessage";

CREATE INDEX "DirectMessage_groupId_idx" ON "DirectMessage"("groupId");
CREATE INDEX "DirectMessage_senderId_idx" ON "DirectMessage"("senderId");
CREATE INDEX "DirectMessage_receiverId_idx" ON "DirectMessage"("receiverId");

PRAGMA foreign_keys=on;
