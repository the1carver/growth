import * as sdk from '@botpress/sdk'
import * as bp from '.botpress'

export type Client = bp.Client
export type Conversation = Awaited<ReturnType<Client['getConversation']>>['conversation']
export type Message = Awaited<ReturnType<Client['getMessage']>>['message']
export type User = Awaited<ReturnType<Client['getUser']>>['user']

