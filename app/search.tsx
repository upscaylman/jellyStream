// Redirection vers le tab search — cette route Stack n'est plus utilisée
import { Redirect } from 'expo-router';

export default function Search() {
    return <Redirect href="/(tabs)/search" />;
}
