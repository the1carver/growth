import axios, { Axios } from 'axios'
import {
  type SFMessagingConfig,
  type CreateTokenResponse,
  type LiveAgentSession,
  SFMessagingConfigSchema, CreateTTSessionResponse,
} from './definitions/schemas'
import { EndConversationReason } from './events/conversation-ended'
import { secrets, Logger } from '.botpress'
import { RuntimeError } from '@botpress/client'
import { v4 } from 'uuid'

class MessagingApi {
  private session?: LiveAgentSession
  private client: Axios
  private apiBaseUrl: string

  constructor(private logger: Logger, private config: SFMessagingConfig, session?: LiveAgentSession) {

    this.apiBaseUrl = config.endpoint + '/iamessage/api/v2'

    this.client = axios.create({
      baseURL: this.apiBaseUrl
    })

    this.session = session

    // Fill default values
    this.config = SFMessagingConfigSchema.parse(config)

    this.client.interceptors.request.use((axionsConfig) => {
      // @ts-ignore
      axionsConfig.headers = {
        ...axionsConfig.headers,
        ...this.getMesssagingConfig().headers
      }
      return axionsConfig
    })
  }

  public async createConversation(conversationId: string, attributes: any): Promise<void> {
    try {
      const { data } = await this.client.post('/conversation', {
        conversationId: conversationId,
        routingAttributes: attributes,
        esDeveloperName: this.config.DeveloperName
      })

      console.log('Created conversation')

      return data
    } catch (e) {
      console.log(e)
      this.logger.forBot().error('Failed to create conversation on Salesforce: ' + e.message)
      throw new RuntimeError('Failed to create conversation on Salesforce: ' + e.message)
    }
  }

  public async createTokenForUnauthenticatedUser(): Promise<CreateTokenResponse> {
    try {
      const { data } = await this.client.post<CreateTokenResponse>('/authorization/unauthenticated/access-token', {
        orgId: this.config.organizationId,
        esDeveloperName: this.config.DeveloperName,
        capabilitiesVersion: "1",
        platform: "Web",
        context: {
          appName: "botpressHITL",
          clientVersion: "1.2.3"
        }
      })

      console.log('Created token', data)

      this.session = { ...this.session, accessToken: data.accessToken  }
      return data
    } catch (e) {
      console.log(e)
      this.logger.forBot().error('Failed to create conversation on Salesforce: ' + e.message)
      throw new RuntimeError('Failed to create conversation on Salesforce: ' + e.message)
    }
  }

  public getCurrentSession() {
    return this.session
  }


  getMesssagingConfig() {
    return {
      headers: {
        ...(this.session?.accessToken && { 'Authorization': 'Bearer ' + this.session?.accessToken}),
        'X-Org-Id': this.config.organizationId,
      }
    }
  }

  // We use Transport Translator to translate from SSE -> Webhook
  public async startSSE(opts?: { webhook: { url: string } }): Promise<CreateTTSessionResponse | undefined> {
    try {
      if(!this.session) {
        throw new RuntimeError('Tried to start a sse Session but doesn\'t have a Messaging Session')
      }

      console.log('Starting SSE Session with data: ', {
        sse: {
          headers: this.getMesssagingConfig().headers,
        },
        target: {
          debug: true,
          url: `${this.config.endpoint}/eventrouter/v1/sse`
        },
        webhook: { url: opts?.webhook.url }
      })

      const { data } = await axios.post<CreateTTSessionResponse>(`${secrets.TT_URL}/api/v1/sse`, {
        sse: {
          headers: this.getMesssagingConfig().headers,
          ignore: {
            onEvent: [
              "ping",
              "CONVERSATION_TYPING_STOPPED_INDICATOR",
              "CONVERSATION_TYPING_STARTED_INDICATOR",
              "CONVERSATION_READ_ACKNOWLEDGEMENT",
              "CONVERSATION_DELIVERY_ACKNOWLEDGEMENT"
            ]
          },
          end: {
            onRawMatch: [ 'force_end_tt_transport' ]
          }
        },
        target: {
          debug: true,
          url: `${this.config.endpoint}/eventrouter/v1/sse`
        },
        webhook: { url: opts?.webhook.url }
      }, {
        headers: {
          secret: secrets.TT_SK
        }
      })

      console.log('Got SSE Key')

      this.session.sseKey = data.data.key
      return data
    } catch (e) {
      this.logger.forBot().error('Failed to start SSE Session with TT: ' + e.message)
      throw new RuntimeError('Failed to start SSE Session with TT: ' + e.message)
    }
  }

  public async stopSSE(transportKey: string) {
    try {
      const response = await axios.delete(`${secrets.TT_URL}/api/v1/sse`, {
        headers: {
          secret: secrets.TT_SK,
          'transport-key': transportKey
        }
      })

      console.log({ stopSSEResponse: response })
    } catch (e) {
      this.logger.forBot().error('Failed to stop SSE Session with TT: ' + e.message)
    }
  }

  public async sendMessage(message: string) {
    if(!this.session) {
      throw new RuntimeError('Tried to send message to a session that is not initilized yet')
    }

    console.log('Sending message with data: ', {
      url: `/conversation/${this.session.conversationId}/message`,
      data: {
        message: {
          id: 'Generating',
          messageType: "StaticContentMessage",
          staticContent: {
            formatType: "Text",
            text: message
          }
        },
        esDeveloperName: this.config.DeveloperName,
        isNewMessagingSession: false
      }
    })

    await this.client.post(`/conversation/${this.session.conversationId}/message`, {
      message: {
        id: v4(),
        messageType: "StaticContentMessage",
        staticContent: {
          formatType: "Text",
          text: message
        }
      },
      esDeveloperName: this.config.DeveloperName,
      isNewMessagingSession: false
    })
  }

  public async closeConversation(reason: EndConversationReason) {
    if(!this.session) {
      throw new RuntimeError('Tried to end a conversation that is not initilized yet')
    }

    await this.client.post(`/conversation/{conversationId}`, {
      ChatEndReason: {
        reason
      }
    })
  }
}

export const getSalesforceClient = (logger: Logger, config: SFMessagingConfig, session?: LiveAgentSession) =>
  new MessagingApi(logger, config, session)
