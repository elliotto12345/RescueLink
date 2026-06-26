import { Text, useColorScheme } from 'react-native'
import { Colours } from '../constants/Colours'

const ThemedText = ({ style, title = false, ...props }) => {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme] ?? Colors.light

  const textColor = title ? theme.title : theme.text

  return (
    <Text 
      style={[{ color: textColor }, style]}
      {...props}
    />
  )
}

export default ThemedText