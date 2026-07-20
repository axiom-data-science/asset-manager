import { atom } from 'jotai'

const headerStateAtom = atom({
  isSmall: false,
  height: '0',
  headerHeightClass: '',
  topSpaceHeightClass: '',
})

export default headerStateAtom
