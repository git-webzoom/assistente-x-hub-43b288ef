import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ContactCard } from '@/components/ContactCard';
import { ContactFormDialog } from '@/components/ContactFormDialog';
import { useContacts, Contact } from '@/hooks/useContacts';
import { Plus, Search, Users } from 'lucide-react';

const Contacts = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);

  const { contacts, isLoading, createContact, updateContact, deleteContact } = useContacts(searchQuery);

  const handleCreateContact = async (data: any) => {
    await createContact.mutateAsync(data);
  };

  const handleUpdateContact = async (data: any) => {
    if (selectedContact) {
      await updateContact.mutateAsync({
        id: selectedContact.id,
        updates: data,
      });
    }
  };

  const handleEdit = (contact: Contact) => {
    setSelectedContact(contact);
    setIsFormOpen(true);
  };

  const handleDelete = (contact: Contact) => {
    setContactToDelete(contact);
  };

  const confirmDelete = async () => {
    if (contactToDelete) {
      await deleteContact.mutateAsync(contactToDelete.id);
      setContactToDelete(null);
    }
  };

  const handleNewContact = () => {
    setSelectedContact(null);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Contatos</h1>
          <p className="text-muted-foreground">
            Gerencie seus contatos e relacionamentos
          </p>
        </div>
        <Button onClick={handleNewContact}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Contato
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, email ou empresa..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Contacts Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-4 border rounded-lg">
              <div className="flex items-start gap-3 mb-3">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">
            {searchQuery ? 'Nenhum contato encontrado' : 'Nenhum contato cadastrado'}
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            {searchQuery
              ? 'Tente ajustar sua busca ou limpar os filtros'
              : 'Comece adicionando seu primeiro contato para gerenciar seus relacionamentos'}
          </p>
          {!searchQuery && (
            <Button onClick={handleNewContact}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Primeiro Contato
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <ContactFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        contact={selectedContact}
        onSubmit={selectedContact ? handleUpdateContact : handleCreateContact}
        isSubmitting={createContact.isPending || updateContact.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!contactToDelete} onOpenChange={() => setContactToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o contato "{contactToDelete?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Contacts;
