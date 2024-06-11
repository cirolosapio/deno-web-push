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
  .post('/send/:user', async (ctx) => {
    const { user } = ctx.params
    const { delay } = await ctx.request.body.json()
    const key = ['users', user, 'subscription']
    const subscription = await kv.get(key)
    console.log({ user, subscription })
    setTimeout(() => {
      webPush.sendNotification(subscription, JSON.stringify({
        title: 'Hello from Deno!',
        body: 'This is a push notification from Deno!',
      }))
    }, (delay ?? 0) * 1000)
    ctx.response.body = { user, subscription }
  })
  .get('/', (ctx) => {
    ctx.response.body = 'Hello from Deno!'
  })

const app = new Application();
app.use(oakCors({ origin: /cirolosapio\.it$/, credentials: true }))
app.use(router.routes());
app.use(router.allowedMethods())

await app.listen({ port: 3000 });

