// @deno-types="npm:@types/web-push"
import webPush from 'npm:web-push'
import { Application, Router } from "@oak/oak";
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts"

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
  .post('/subscribe/:user', async (ctx) => {
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
    const { delay, requireInteraction, title, body, withPayload, urgency } = await ctx.request.body.json()
    const key = ['users', user, 'subscription']
    const subscription = (await kv.get<webPush.PushSubscription>(key)).value
    const payload = withPayload ? JSON.stringify({ title, body }) : undefined

    console.log({ user, requireInteraction, title, body, delay, payload })

    setTimeout(async () => {
      try {
        console.log('sending')

        console.log('endpoint', subscription?.endpoint)
        console.log('keys', subscription?.keys)

        const options: webPush.RequestOptions = {
          urgency,
          vapidDetails: {
            subject: 'mailto:info@cirolosapio.it',
            publicKey: Deno.env.get('VAPID_PUBLIC_KEY')!,
            privateKey: Deno.env.get('VAPID_PRIVATE_KEY')!,
          }
        }
        console.log('--- ~ setTimeout ~ options:', options)

        const requestDetails = webPush.generateRequestDetails(subscription!, payload, options)
        console.log('--- ~ setTimeout ~ requestDetails:', requestDetails)

        const res = await webPush.sendNotification(subscription!, payload, options)
        console.log('sent', res)
      } catch (error) {
        if (error instanceof webPush.WebPushError) {
          console.log('WebPushError', error.statusCode, error.body, error.message, error.cause)
        } else {
          console.log('Error', error)
        }
      }
    }, (delay ?? 0) * 1000)

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

