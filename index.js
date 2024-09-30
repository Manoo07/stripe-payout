require('dotenv').config();
const express = require('express')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const bodyParser = require('body-parser');
const { PrismaClient } = require('@prisma/client');

const app = express();
const PORT = process.env.PORT || 3000;
const prisma = new PrismaClient();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static('public'));

app.post('/signup', async (req, res) => {
    const { email } = req.body

    try {
        const account = await stripe.accounts.create({
            type: 'custom',
            country: 'US',
            email: email,
            business_type: 'individual',
            capabilities: {
                transfers: { requested: true },
            },
        })
        const user = await prisma.user.create({
            data: {
                email: email,
                stripeAccountId: account.id
            }
        })
        res.redirect(`/dashboard?user_id=${user.id}`);
    } catch (err) {
        console.error('Error creating Stripe account:', error);
        res.status(500).send('Error creating Stripe account');
    }
})


app.get('/', (req, res) => {
    return res.status(200).json({
        message: "Hi there this is test POC"
    })
})

app.get('/dashboard', async (req, res) => {
    const userId = parseInt(req.query.user_id);
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
        })
        if (!user) {
            return res.status(404).send('User not found');
        }
        res.send(`
      <h1>Welcome, ${user.email}</h1>
      <p>Your Stripe Account ID: ${user.stripeAccountId}</p>
      <form action="/payout" method="POST">
        <input type="hidden" name="user_id" value="${userId}" />
        <input type="number" name="amount" placeholder="Amount in cents" required />
        <input type="text" name="currency" placeholder="Currency (e.g., usd)" required />
        <input type="text" name="card_number" placeholder="Debit Card Number" required />
        <input type="text" name="exp_month" placeholder="Expiry Month" required />
        <input type="text" name="exp_year" placeholder="Expiry Year" required />
        <input type="text" name="cvc" placeholder="CVC" required />
        <button type="submit">Fetch Payout</button>
      </form>
    `);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).send('Error fetching user');
    }
})

app.post('/payout', async (req, res) => {
    const { user_id, amount, currency, card_number, exp_month, exp_year, cvv } = req.body;
    try {
        const user = await prisma.user.findUnique({
            where: { id: parseInt(user_id) },
        });

        if (!user) {
            return res.status(404).send('User not found');
        }

        const balance = await stripe.balance.retrieve({
            stripeAccount: user.stripeAccountId,
        });

        const availableBalance = balance.available.find(b => b.currency === currency);
        if (!availableBalance || availableBalance.amount < amount) {
            return res.status(400).send('Insufficient funds for this payout');
        }

        const externalAccounts = await stripe.accounts.listExternalAccounts(user.stripeAccountId);
        if (externalAccounts.data.length === 0) {
            const token = await stripe.tokens.create({
                card: {
                    number: card_number,
                    exp_month: exp_month,
                    exp_year: exp_year,
                    cvc: cvv,
                },
            });

            await stripe.accounts.createExternalAccount(user.stripeAccountId, {
                external_account: token.id,
            });
        }

        const payout = await stripe.payouts.create(
            {
                amount: parseInt(amount),
                currency: currency,
            },
            {
                stripeAccount: user.stripeAccountId,
            }
        );

        res.send('Payout successful!');

    } catch (error) {
        console.error('Error making payout:', error);
        res.status(500).send('Error making payout');
    }
});


app.listen(PORT, () => {
    console.log(`Server Started At http://localhost:${PORT}`);
});
