import webPush from 'npm:web-push'
import { Application, Router } from "@oak/oak";
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts"

// const keys = webPush.generateVAPIDKeys()
const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')
console.log('--- ~ publicKey:', publicKey)
const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')
console.log('--- ~ privateKey:', privateKey)

webPush.setVapidDetails(
  'mailto:info@cirolosapio.it',
  publicKey,
  privateKey,
)

const kv = await Deno.openKv()

const router = new Router();
router
  .post('/user/:user', async (ctx) => {
    const { user } = ctx.params
    const { device } = await ctx.request.body.json()
    console.log({ user, device })
    const key = ['users', user, 'device']
    const userDevice = await kv.get(key)
    await kv.atomic()
      .check(userDevice)
      .set(key, device)
      .commit()
    ctx.response.body = { user, device }
  })
  .post('/subscription/:user', async (ctx) => {
    const { user } = ctx.params
    const { subscription } = await ctx.request.body.json()
    console.log({ user, subscription })
    const key = ['users', user, 'subscription']
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

