import { defineFeature, loadFeature } from "jest-cucumber";
import request from "supertest";
import type { UserWithProfiles } from "../../../../src/auth/domain/ports/user.repository.port";
import { AuthTestWorld, TEST_PASSWORD } from "../../../support/test-app";

const feature = loadFeature("test/features/11-messaging/messaging.feature");

let world: AuthTestWorld;
let response: request.Response;
let threadId: string;

async function loginAndGetToken(email: string): Promise<string> {
  const res = await request(world.http).post("/auth/login").send({
    email,
    password: TEST_PASSWORD,
  });
  return res.body.accessToken as string;
}

async function seedProfessionalAndLogin(
  email: string,
  specialization: "PERSONAL_TRAINER" | "NUTRITIONIST",
): Promise<{ user: UserWithProfiles; token: string }> {
  const user = await world.seedProfessional(email, {
    password: TEST_PASSWORD,
    approvalStatus: "APPROVED",
    specializations: [specialization],
  });
  const token = await loginAndGetToken(email);
  return { user, token };
}

async function seedClientAndLogin(
  email: string,
): Promise<{ user: UserWithProfiles; token: string }> {
  const user = await world.seedClient(email, { password: TEST_PASSWORD });
  const token = await loginAndGetToken(email);
  return { user, token };
}

// Invites `clientEmail` for `specialization` (as `proToken`) and immediately
// accepts (as `clientToken`) — this is the real HTTP flow, deliberately not
// the direct-DB seedLink() helper, because it's what actually fires
// AcceptLinkUseCase's LINK_STATUS_CHANGED emit and proves the thread
// auto-creation side effect these scenarios are about.
async function inviteAndAccept(
  proToken: string,
  clientEmail: string,
  specialization: "PERSONAL_TRAINER" | "NUTRITIONIST",
): Promise<void> {
  const invite = await request(world.http)
    .post("/links/invites")
    .set("Authorization", `Bearer ${proToken}`)
    .send({ clientEmail, specializations: [specialization] });
  const clientToken = await loginAndGetToken(clientEmail);
  await request(world.http)
    .post(`/links/${invite.body[0].id}/accept`)
    .set("Authorization", `Bearer ${clientToken}`);
}

beforeAll(async () => {
  world = await AuthTestWorld.boot();
});
afterAll(async () => {
  await world.close();
});
beforeEach(async () => {
  await world.reset();
});

defineFeature(feature, (test) => {
  test("Accepting an invite auto-creates an ACTIVE thread, and both parties can exchange messages", async ({
    given,
    when,
    then,
    and,
  }) => {
    let proToken = "";
    let clientToken = "";
    let clientId = "";

    given(
      'an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in',
      async () => {
        const seeded = await seedProfessionalAndLogin("pro@example.com", "PERSONAL_TRAINER");
        proToken = seeded.token;
      },
    );

    and(
      'a verified client "cli@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        const seeded = await seedClientAndLogin("cli@example.com");
        clientToken = seeded.token;
        clientId = seeded.user.id;
      },
    );

    and(
      'the professional invites "cli@example.com" for specialization "PERSONAL_TRAINER" and the client accepts',
      async () => {
        await inviteAndAccept(proToken, "cli@example.com", "PERSONAL_TRAINER");
      },
    );

    then(
      "a thread with status \"ACTIVE\" already exists for that pair, before any message is sent",
      async () => {
        response = await request(world.http)
          .get(`/messaging/threads/with/${clientId}`)
          .set("Authorization", `Bearer ${proToken}`);
        expect(response.status).toBe(200);
        expect(response.body.thread).toBeTruthy();
        expect(response.body.thread.status).toBe("ACTIVE");
        threadId = response.body.thread.id;
      },
    );

    when(
      'the professional sends the message "Bem-vindo ao programa!" in that thread',
      async () => {
        response = await request(world.http)
          .post(`/messaging/threads/${threadId}/messages`)
          .set("Authorization", `Bearer ${proToken}`)
          .send({ body: "Bem-vindo ao programa!" });
      },
    );

    then("the message is created with status 201", () => {
      expect(response.status).toBe(201);
      expect(response.body.body).toBe("Bem-vindo ao programa!");
    });

    when("the client fetches the thread", async () => {
      response = await request(world.http)
        .get(`/messaging/threads/${threadId}`)
        .set("Authorization", `Bearer ${clientToken}`);
    });

    then("the client sees the professional's message, now marked read", () => {
      expect(response.status).toBe(200);
      expect(response.body.messages).toHaveLength(1);
      expect(response.body.messages[0].body).toBe("Bem-vindo ao programa!");
      expect(response.body.messages[0].readAt).toBeTruthy();
    });

    and("the professional's unread count for that thread is 0", async () => {
      response = await request(world.http)
        .get("/messaging/threads")
        .set("Authorization", `Bearer ${proToken}`);
      const thread = response.body.threads.find((t: { id: string }) => t.id === threadId);
      expect(thread.unreadCount).toBe(0);
    });
  });

  test("A Client linked to both a PT and a Nutritionist has two independent threads", async ({
    given,
    when,
    then,
    and,
  }) => {
    let ptToken = "";
    let nutriToken = "";
    let clientToken = "";

    given(
      'an APPROVED professional "pt@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in',
      async () => {
        const seeded = await seedProfessionalAndLogin("pt@example.com", "PERSONAL_TRAINER");
        ptToken = seeded.token;
      },
    );

    and(
      'an APPROVED professional "nutri@example.com" with password "S3cure!Pass" and specialization "NUTRITIONIST" who is logged in',
      async () => {
        const seeded = await seedProfessionalAndLogin("nutri@example.com", "NUTRITIONIST");
        nutriToken = seeded.token;
      },
    );

    and(
      'a verified client "cli@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        const seeded = await seedClientAndLogin("cli@example.com");
        clientToken = seeded.token;
      },
    );

    and(
      'the professional "pt@example.com" invites "cli@example.com" for specialization "PERSONAL_TRAINER" and the client accepts',
      async () => {
        await inviteAndAccept(ptToken, "cli@example.com", "PERSONAL_TRAINER");
      },
    );

    and(
      'the professional "nutri@example.com" invites "cli@example.com" for specialization "NUTRITIONIST" and the client accepts',
      async () => {
        await inviteAndAccept(nutriToken, "cli@example.com", "NUTRITIONIST");
      },
    );

    when("the client lists their threads", async () => {
      response = await request(world.http)
        .get("/messaging/threads")
        .set("Authorization", `Bearer ${clientToken}`);
    });

    then("the client has exactly 2 distinct threads", () => {
      expect(response.status).toBe(200);
      expect(response.body.threads).toHaveLength(2);
      const ids = new Set(response.body.threads.map((t: { id: string }) => t.id));
      expect(ids.size).toBe(2);
    });

    when(
      'the client sends the message "Oi treinador" in the thread with "pt@example.com"',
      async () => {
        // The list payload carries professional.id, not email — resolve the
        // pt@example.com thread by looking up that professional's id first.
        const ptUser = await world.prisma.user.findUniqueOrThrow({
          where: { email: "pt@example.com" },
        });
        const threads = response.body.threads as Array<{
          id: string;
          professional: { id: string };
        }>;
        const ptThread = threads.find((t) => t.professional.id === ptUser.id)!;
        response = await request(world.http)
          .post(`/messaging/threads/${ptThread.id}/messages`)
          .set("Authorization", `Bearer ${clientToken}`)
          .send({ body: "Oi treinador" });
      },
    );

    then('the thread with "nutri@example.com" has no messages', async () => {
      expect(response.status).toBe(201);
      const nutriUser = await world.prisma.user.findUniqueOrThrow({
        where: { email: "nutri@example.com" },
      });
      const nutriThread = await world.prisma.messageThread.findUniqueOrThrow({
        where: {
          professionalId_clientId: {
            professionalId: nutriUser.id,
            clientId: (
              await world.prisma.user.findUniqueOrThrow({ where: { email: "cli@example.com" } })
            ).id,
          },
        },
        include: { messages: true },
      });
      expect(nutriThread.messages).toHaveLength(0);
    });
  });

  test("Unlinking makes the thread read-only; history is preserved and new sends are rejected", async ({
    given,
    when,
    then,
    and,
  }) => {
    let proToken = "";
    let clientToken = "";

    given(
      'an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in',
      async () => {
        const seeded = await seedProfessionalAndLogin("pro@example.com", "PERSONAL_TRAINER");
        proToken = seeded.token;
      },
    );

    and(
      'a verified client "cli@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        const seeded = await seedClientAndLogin("cli@example.com");
        clientToken = seeded.token;
      },
    );

    and(
      'the professional invites "cli@example.com" for specialization "PERSONAL_TRAINER" and the client accepts',
      async () => {
        await inviteAndAccept(proToken, "cli@example.com", "PERSONAL_TRAINER");
        const pro = await world.prisma.user.findUniqueOrThrow({
          where: { email: "pro@example.com" },
        });
        const cli = await world.prisma.user.findUniqueOrThrow({
          where: { email: "cli@example.com" },
        });
        const thread = await world.prisma.messageThread.findUniqueOrThrow({
          where: { professionalId_clientId: { professionalId: pro.id, clientId: cli.id } },
        });
        threadId = thread.id;
      },
    );

    and('the professional sends the message "Vamos comecar" in that thread', async () => {
      response = await request(world.http)
        .post(`/messaging/threads/${threadId}/messages`)
        .set("Authorization", `Bearer ${proToken}`)
        .send({ body: "Vamos comecar" });
      expect(response.status).toBe(201);
    });

    when("the client unlinks the relationship", async () => {
      const link = await world.prisma.professionalClientLink.findFirstOrThrow({
        where: { status: "ACTIVE" },
      });
      response = await request(world.http)
        .post(`/links/${link.id}/unlink`)
        .set("Authorization", `Bearer ${clientToken}`);
      expect(response.status).toBe(200);
    });

    then('the thread status is "READ_ONLY" and the prior message is still visible', async () => {
      response = await request(world.http)
        .get(`/messaging/threads/${threadId}`)
        .set("Authorization", `Bearer ${clientToken}`);
      expect(response.status).toBe(200);
      expect(response.body.thread.status).toBe("READ_ONLY");
      expect(response.body.messages).toHaveLength(1);
      expect(response.body.messages[0].body).toBe("Vamos comecar");
    });

    and(
      "the client attempting to send a new message in that thread is rejected with status 403",
      async () => {
        response = await request(world.http)
          .post(`/messaging/threads/${threadId}/messages`)
          .set("Authorization", `Bearer ${clientToken}`)
          .send({ body: "Ainda ai?" });
        expect(response.status).toBe(403);
      },
    );
  });

  test("Re-linking after an unlink reactivates the same thread rather than creating a new one", async ({
    given,
    when,
    then,
    and,
  }) => {
    let proToken = "";
    let clientToken = "";

    given(
      'an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in',
      async () => {
        const seeded = await seedProfessionalAndLogin("pro@example.com", "PERSONAL_TRAINER");
        proToken = seeded.token;
      },
    );

    and(
      'a verified client "cli@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        const seeded = await seedClientAndLogin("cli@example.com");
        clientToken = seeded.token;
      },
    );

    and(
      'the professional invites "cli@example.com" for specialization "PERSONAL_TRAINER" and the client accepts',
      async () => {
        await inviteAndAccept(proToken, "cli@example.com", "PERSONAL_TRAINER");
      },
    );

    and('the professional sends the message "Primeira mensagem" in that thread', async () => {
      const pro = await world.prisma.user.findUniqueOrThrow({
        where: { email: "pro@example.com" },
      });
      const cli = await world.prisma.user.findUniqueOrThrow({
        where: { email: "cli@example.com" },
      });
      const thread = await world.prisma.messageThread.findUniqueOrThrow({
        where: { professionalId_clientId: { professionalId: pro.id, clientId: cli.id } },
      });
      threadId = thread.id;
      response = await request(world.http)
        .post(`/messaging/threads/${threadId}/messages`)
        .set("Authorization", `Bearer ${proToken}`)
        .send({ body: "Primeira mensagem" });
      expect(response.status).toBe(201);
    });

    and("the client unlinks the relationship", async () => {
      const link = await world.prisma.professionalClientLink.findFirstOrThrow({
        where: { status: "ACTIVE" },
      });
      await request(world.http)
        .post(`/links/${link.id}/unlink`)
        .set("Authorization", `Bearer ${clientToken}`);
    });

    when(
      'the professional invites "cli@example.com" again for specialization "PERSONAL_TRAINER" and the client accepts',
      async () => {
        await inviteAndAccept(proToken, "cli@example.com", "PERSONAL_TRAINER");
      },
    );

    then(
      'the thread id is unchanged, its status is "ACTIVE" again, and the earlier message is still there',
      async () => {
        response = await request(world.http)
          .get(`/messaging/threads/${threadId}`)
          .set("Authorization", `Bearer ${proToken}`);
        expect(response.status).toBe(200);
        expect(response.body.thread.id).toBe(threadId);
        expect(response.body.thread.status).toBe("ACTIVE");
        expect(response.body.messages).toHaveLength(1);
        expect(response.body.messages[0].body).toBe("Primeira mensagem");
      },
    );
  });

  test("A non-party cannot read or send messages in a thread they are not part of", async ({
    given,
    when,
    then,
    and,
  }) => {
    let proToken = "";
    let clientToken = "";
    let otherProToken = "";
    let otherClientToken = "";

    given(
      'an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in',
      async () => {
        const seeded = await seedProfessionalAndLogin("pro@example.com", "PERSONAL_TRAINER");
        proToken = seeded.token;
      },
    );

    and(
      'a verified client "cli@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        const seeded = await seedClientAndLogin("cli@example.com");
        clientToken = seeded.token;
      },
    );

    and(
      'the professional invites "cli@example.com" for specialization "PERSONAL_TRAINER" and the client accepts',
      async () => {
        await inviteAndAccept(proToken, "cli@example.com", "PERSONAL_TRAINER");
        const pro = await world.prisma.user.findUniqueOrThrow({
          where: { email: "pro@example.com" },
        });
        const cli = await world.prisma.user.findUniqueOrThrow({
          where: { email: "cli@example.com" },
        });
        const thread = await world.prisma.messageThread.findUniqueOrThrow({
          where: { professionalId_clientId: { professionalId: pro.id, clientId: cli.id } },
        });
        threadId = thread.id;
      },
    );

    and(
      'an APPROVED professional "other-pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in',
      async () => {
        const seeded = await seedProfessionalAndLogin(
          "other-pro@example.com",
          "PERSONAL_TRAINER",
        );
        otherProToken = seeded.token;
      },
    );

    and(
      'a verified client "other-cli@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        const seeded = await seedClientAndLogin("other-cli@example.com");
        otherClientToken = seeded.token;
      },
    );

    when('the professional "other-pro@example.com" tries to fetch that thread', async () => {
      response = await request(world.http)
        .get(`/messaging/threads/${threadId}`)
        .set("Authorization", `Bearer ${otherProToken}`);
    });

    then("the request is rejected with status 404", () => {
      expect(response.status).toBe(404);
    });

    when('the client "other-cli@example.com" tries to send a message in that thread', async () => {
      response = await request(world.http)
        .post(`/messaging/threads/${threadId}/messages`)
        .set("Authorization", `Bearer ${otherClientToken}`)
        .send({ body: "Posso entrar?" });
    });

    then("the request is rejected with status 404", () => {
      expect(response.status).toBe(404);
    });
  });

  test("An Admin has read-only support access to any thread", async ({
    given,
    when,
    then,
    and,
  }) => {
    let proToken = "";
    let adminToken = "";

    given(
      'an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in',
      async () => {
        const seeded = await seedProfessionalAndLogin("pro@example.com", "PERSONAL_TRAINER");
        proToken = seeded.token;
      },
    );

    and(
      'a verified client "cli@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        await seedClientAndLogin("cli@example.com");
      },
    );

    and(
      'the professional invites "cli@example.com" for specialization "PERSONAL_TRAINER" and the client accepts',
      async () => {
        await inviteAndAccept(proToken, "cli@example.com", "PERSONAL_TRAINER");
        const pro = await world.prisma.user.findUniqueOrThrow({
          where: { email: "pro@example.com" },
        });
        const cli = await world.prisma.user.findUniqueOrThrow({
          where: { email: "cli@example.com" },
        });
        const thread = await world.prisma.messageThread.findUniqueOrThrow({
          where: { professionalId_clientId: { professionalId: pro.id, clientId: cli.id } },
        });
        threadId = thread.id;
      },
    );

    and(
      'an admin "admin@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        await world.seedAdmin("admin@example.com");
        adminToken = await loginAndGetToken("admin@example.com");
      },
    );

    when("the admin fetches that thread", async () => {
      response = await request(world.http)
        .get(`/messaging/threads/${threadId}`)
        .set("Authorization", `Bearer ${adminToken}`);
    });

    then("the admin can read it with status 200", () => {
      expect(response.status).toBe(200);
      expect(response.body.thread.id).toBe(threadId);
    });

    when("the admin tries to send a message in that thread", async () => {
      response = await request(world.http)
        .post(`/messaging/threads/${threadId}/messages`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ body: "Suporte aqui" });
    });

    then("the request is rejected with status 403", () => {
      expect(response.status).toBe(403);
    });
  });

  test("A message body containing HTML-looking text round-trips as literal text, never interpreted", async ({
    given,
    when,
    then,
    and,
  }) => {
    let proToken = "";

    given(
      'an APPROVED professional "pro@example.com" with password "S3cure!Pass" and specialization "PERSONAL_TRAINER" who is logged in',
      async () => {
        const seeded = await seedProfessionalAndLogin("pro@example.com", "PERSONAL_TRAINER");
        proToken = seeded.token;
      },
    );

    and(
      'a verified client "cli@example.com" with password "S3cure!Pass" who is logged in',
      async () => {
        await seedClientAndLogin("cli@example.com");
      },
    );

    and(
      'the professional invites "cli@example.com" for specialization "PERSONAL_TRAINER" and the client accepts',
      async () => {
        await inviteAndAccept(proToken, "cli@example.com", "PERSONAL_TRAINER");
        const pro = await world.prisma.user.findUniqueOrThrow({
          where: { email: "pro@example.com" },
        });
        const cli = await world.prisma.user.findUniqueOrThrow({
          where: { email: "cli@example.com" },
        });
        const thread = await world.prisma.messageThread.findUniqueOrThrow({
          where: { professionalId_clientId: { professionalId: pro.id, clientId: cli.id } },
        });
        threadId = thread.id;
      },
    );

    when(
      'the professional sends the message "<b>bold</b><script>alert(1)</script>" in that thread',
      async () => {
        response = await request(world.http)
          .post(`/messaging/threads/${threadId}/messages`)
          .set("Authorization", `Bearer ${proToken}`)
          .send({ body: "<b>bold</b><script>alert(1)</script>" });
      },
    );

    then("the stored message body is the exact literal string, untouched", async () => {
      expect(response.status).toBe(201);
      expect(response.body.body).toBe("<b>bold</b><script>alert(1)</script>");
      const row = await world.prisma.message.findUniqueOrThrow({
        where: { id: response.body.id },
      });
      expect(row.body).toBe("<b>bold</b><script>alert(1)</script>");
    });
  });
});
