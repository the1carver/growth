import {startHitl, stopHitl, createUser, forceStopHitl } from './hitl'
import { IntegrationProps } from '.botpress'

export default {
  startHitl,
  stopHitl,
  forceStopHitl,
  createUser,
} satisfies IntegrationProps['actions']
