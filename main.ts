import webPush from 'npm:web-push'
import { Application, Router } from "@oak/oak";
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts"

// const keys = webPush.generateVAPIDKeys()
const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')
const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')

webPush.setVapidDetails(
  'mailto:info@cirolosapio.it',
  publicKey,
  privateKey,
)

const kv = await Deno.openKv()

const router = new Router();
router
  .post('/subscription/:user', async (ctx) => {
    const { user } = ctx.params
    const { subscription } = await ctx.request.body.json()
    console.log({ user, subscription })
    const key = ['users', user]
    const userSubscription = await kv.get(key)
    await kv.atomic()
      .check(userSubscription)
      .set(key, subscription)
      .commit()
    ctx.response.body = { user, subscription }
  })

const app = new Application();
app.use(oakCors({ origin: true, }))
app.use(router.routes());
app.use(router.allowedMethods())

await app.listen({ port: 3000 });

