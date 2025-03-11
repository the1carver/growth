import getProduct from './get-product'
import callApi from './call-api'
import * as bp from '.botpress'

export default {
  getProduct,
  callApi,
} satisfies bp.IntegrationProps['actions'] 