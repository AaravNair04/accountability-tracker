-- Optional public usernames make peer identity clearer without replacing email login.

ALTER TABLE "users"
ADD COLUMN "username" TEXT;

CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
