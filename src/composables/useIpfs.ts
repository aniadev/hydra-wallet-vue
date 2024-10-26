export const useIpfs = () => {
  async function fetchImage(imageHash: string) {
    return new Promise<string>((resolve, reject) => {
      const blockfrostApiKey = import.meta.env.VITE_APP_BLOCKFROST_IPFS_API_KEY
      if (!blockfrostApiKey) {
        console.error('Missing VITE_APP_BLOCKFROST_IPFS_API_KEY')
        reject('Missing VITE_APP_BLOCKFROST_IPFS_API_KEY')
      }
      const hash = imageHash.replace('ipfs://', '')
      const url = `https://ipfs.blockfrost.io/api/v0/ipfs/gateway/${hash}`
      const xhr = new XMLHttpRequest()
      // Set up the request as a GET and specify the response type as 'blob' for binary data.
      xhr.open('GET', url, true)
      xhr.responseType = 'blob'
      xhr.setRequestHeader('Project_id', blockfrostApiKey) //
      // Define what happens on a successful data fetch
      xhr.onload = function () {
        if (xhr.status === 200) {
          // Convert the blob to an object URL
          const imageBlob = xhr.response
          const imageUrl = URL.createObjectURL(imageBlob)
          resolve(imageUrl)
        } else {
          console.error('Error fetching image:', xhr.statusText)
          reject(xhr.statusText)
        }
      }
      // Define what happens in case of an error
      xhr.onerror = function () {
        console.error('Request failed')
        reject('Request failed')
      }
      // Send the request
      xhr.send()
    })
  }
  return { fetchImage }
}
