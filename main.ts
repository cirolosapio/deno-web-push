// @deno-types="npm:@types/web-push"
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
    const { delay, requireInteraction, title, body, withPayload } = await ctx.request.body.json()
    const key = ['users', user, 'subscription']
    // @ts-expect-error exists
    const { expirationTime, ...subscription } = (await kv.get<webPush.PushSubscription>(key)).value
    const payload = withPayload ? JSON.stringify({ title, body }) : undefined
    console.log({ user, requireInteraction, title, body, delay, payload, subscription, expirationTime })
    await new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          console.log('sending')
          const res = await webPush.sendNotification(subscription!, payload)
          console.log('sent', res)
          resolve(true)
        } catch (error) {
          if (error instanceof webPush.WebPushError) {
            console.log('WebPushError', error.statusCode, error.body, error.message, error.cause)
          } else {
            console.log('Error', error)
          }
          ctx.response.body = { error }
          reject(error)
        }
      }, (delay ?? 0) * 1000)
    })
    ctx.response.body = { user, title, body, delay }
  })
  .get('/', ctx => {
    ctx.response.body = 'Hello from Deno!'
  })

const app = new Application();
app.use(oakCors({ origin: /cirolosapio\.it$/, credentials: true }))
app.use(router.routes());
app.use(router.allowedMethods())

await app.listen({ port: 3000 });

