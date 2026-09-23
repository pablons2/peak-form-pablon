-- AddUniqueConstraint
ALTER TABLE "professional_client_links" ADD CONSTRAINT "professional_client_links_professionalId_clientId_key" UNIQUE ("professionalId", "clientId");
