import { remapProps } from 'nativewind';
import { Button, Card, Chip } from 'react-native-paper';

remapProps(Card, { className: 'style' });
remapProps(Card.Content, { className: 'style' });
remapProps(Button, { className: 'style' });
remapProps(Chip, { className: 'style' });
