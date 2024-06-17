import axios from 'axios'
import { PrismaClient } from '@prisma/client'

interface Country {
    name: string
    iso2?: string
    iso3?: string
    states: {
        name: string
        state_code?: string
    }[]
}

const prisma = new PrismaClient()

const limitConcurrency = async <T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> => {
    const results: T[] = []
    const executing: Promise<void>[] = []

    const runTask = async (task: () => Promise<T>) => {
        const result = await task()
        results.push(result)
    }

    for (const task of tasks) {
        const p = runTask(task).then(() => {
            executing.splice(executing.indexOf(p), 1)
        })
        executing.push(p)
        if (executing.length >= limit) {
            await Promise.race(executing)
        }
    }

    await Promise.all(executing)
    return results
}

const countries = async () => {
    const { data: { data } } = await axios.get('https://countriesnow.space/api/v0.1/countries/states')

    const countries = data as Country[]

    const countryTasks = countries.map(country => async () => {
        const c = await prisma.country.create({
            data: {
                name: country.name,
                iso2: country?.iso2,
                iso3: country?.iso3,
            }
        })

        const statesData = country.states.map(state => ({
            name: state.name,
            state_code: state?.state_code,
            countryId: c.id
        }))

        await prisma.state.createMany({
            data: statesData
        })

        return c
    })

    await limitConcurrency(countryTasks, 5)
}

countries().catch(async (err) => {
    console.error(err)
    await prisma.$disconnect()
    process.exit(1)
})
