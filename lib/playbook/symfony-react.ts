import type { Pile } from "./types";

const featureFullstack = {
  id: "feature",
  label: "Feature full-stack",
  resume:
    "La séquence du playbook, dans l'ordre : le contrat backend, la route, les types générés, le composant, le cache, les tests, la porte qualité.",
  ecrans: [
    {
      id: "contrat",
      rang: "1",
      titre: "Modéliser le contrat backend",
      intention:
        "PHP est la source de vérité. Les types et la validation vivent sur l'entité, et tout le reste en découle.",
      fichier: "src/Entity/SearchAlert.php",
      langage: "php",
      source: "symfony-guidelines.md, Playbook 1 · reactony.md §2",
      surligne: [7, 8, 9],
      piege:
        "Charge utile 1:1 avec l'entité : l'entité directement. Sous-ensemble d'une grosse entité : un DTO allowlist plus ObjectMapper, pour la sécurité. Rien qui corresponde à une entité : un DTO simple.",
      code: `<?php

class SearchAlert
{
    #[ORM\\Id]
    #[ORM\\GeneratedValue(strategy: 'IDENTITY')]
    #[ORM\\Column]
    private ?int $id = null;  // privé et sans Groups : le Serializer l'ignore

    #[Assert\\NotBlank]
    #[Assert\\Count(min: 1)]
    #[Groups(['search_alert:read', 'search_alert:create'])]
    public array $channels = [];

    #[Assert\\Email]
    #[Groups(['search_alert:create'])]
    public ?string $email = null;
}`,
    },
    {
      id: "route",
      rang: "2",
      titre: "La route du contrôleur",
      intention:
        "format: 'json' est obligatoire, #[IsGranted] aussi. Le contrôleur oriente : Domain décide, Service exécute.",
      fichier: "src/Controller/SearchAlertController.php",
      langage: "php",
      source: "symfony-guidelines.md §3 · Playbook 2",
      surligne: [5, 6, 7],
      piege:
        "Sans format: 'json', les erreurs 422 arrivent en HTML et le frontend ne sait plus les parser. Et un docblock en prose fuit dans le summary OpenAPI, donc dans le JSDoc du SDK : le garder en tags seulement.",
      code: `<?php

/** @return array<int, SearchAlert> */
#[IsGranted('ROLE_USER')]
#[Route('/api/search-alerts', methods: ['POST'], format: 'json')]
#[Serialize(code: 201, context: ['groups' => ['search_alert:read']])]
public function create(
    #[MapRequestPayload] SearchAlert $searchAlert,
): SearchAlert {
    // CRUD simple : l'EntityManager directement dans le contrôleur.
    $this->entityManager->persist($searchAlert);
    $this->entityManager->flush();

    return $searchAlert;
}`,
    },
    {
      id: "types",
      rang: "3",
      titre: "La génération de types",
      intention:
        "Une commande, et le contrat PHP devient des types TS, du Zod, un SDK et les queryOptions. Rien n'est écrit à la main de ce côté.",
      fichier: "Makefile",
      langage: "makefile",
      source: "symfony-guidelines.md, Playbook 3 · reactony.md §5",
      surligne: [5],
      piege:
        "openapi.yaml et assets/lib/api/ sont commités : la porte de dérive compare le généré au commité, et git diff --exit-code ne verrait rien s'ils étaient ignorés.",
      code: `types:
	php -d memory_limit=512M bin/console nelmio:apidoc:dump --format=yaml > openapi.yaml
	pnpm openapi-ts

# En CI, la porte de dérive :
#   make types && git diff --exit-code openapi.yaml assets/lib/api/`,
    },
    {
      id: "genere",
      rang: "3 bis",
      titre: "Ce que la commande a écrit pour vous",
      intention:
        "Une commande, et tout le contrat backend existe en TypeScript : les types, les schémas Zod, une fonction par endpoint, les options TanStack Query. Ce dossier se consomme, il ne s'écrit pas.",
      fichier: "assets/lib/api/",
      langage: "ts",
      source: "reactony.md §5",
      surligne: [9, 10, 13, 16, 19],
      piege:
        "Le dossier est commité, comme openapi.yaml. La porte de dérive compare le généré au commité : git diff --exit-code ne verrait rien s'il était ignoré.",
      code: `// Écrit par \`make types\`, commité, jamais édité à la main :
//
//   assets/lib/api/
//     types.gen.ts   les types du contrat, un par schéma OpenAPI
//     zod.gen.ts     les schémas Zod, tirés des contraintes #[Assert] du PHP
//     sdk.gen.ts     une fonction typée par endpoint, multipart compris
//     ...            les queryOptions et mutationOptions du plugin TanStack Query

import { getSearchAlertListOptions, postSearchAlert } from "@/lib/api";
import { zSearchAlert } from "@/lib/api/zod.gen";

// Lire : les options générées portent déjà la queryKey et le queryFn.
const { data } = useQuery({ ...getSearchAlertListOptions({ query: filters }) });

// Valider : le schéma descend des contraintes PHP, il ne se réécrit pas ici.
const form = useForm({ resolver: zodResolver(zSearchAlert) });

// Écrire : une fonction par endpoint, typée sur le corps attendu.
await postSearchAlert({ body: values });`,
    },
    {
      id: "formulaire",
      rang: "4",
      titre: "Le composant React",
      intention:
        "Un seul patron de formulaire : Controller de RHF, la famille Field de shadcn, le Zod généré, useMutation. Le 422 revient champ par champ.",
      fichier: "assets/components/search-alert-form.tsx",
      langage: "tsx",
      source: "reactony.md §4 · §3",
      surligne: [9, 15, 16, 17],
      piege:
        "Les deux clés : data-invalid sur <Field>, qui bascule le bloc entier en état d'erreur, et aria-invalid sur le contrôle. Le vieux <Form>/<FormField>/<FormMessage> est toléré dans l'existant, pas pour du neuf.",
      code: `import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";

import { postSearchAlert } from "@/lib/api";
import { zSearchAlert } from "@/lib/api/zod.gen"; // généré
import { handleSdkError } from "@/lib/parseViolations";

type FormValues = z.infer<typeof zSearchAlert>;

const form = useForm<FormValues>({
  resolver: zodResolver(zSearchAlert),
  defaultValues: { channels: [], email: "" },
});

const mutation = useMutation({
  mutationFn: async (values: FormValues) => {
    const result = await postSearchAlert({ body: values });
    const errors = handleSdkError(result);
    if (errors) {
      Object.entries(errors).forEach(([field, message]) =>
        form.setError(field as any, { message }),
      );
      throw new Error("Validation failed");
    }
  },
});

<Controller
  name="channels"
  control={form.control}
  render={({ field, fieldState }) => (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor={field.name}>Canaux</FieldLabel>
      <Input id={field.name} aria-invalid={fieldState.invalid} {...field} />
      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
    </Field>
  )}
/>;`,
    },
    {
      id: "action-simple",
      rang: "4 bis",
      titre: "Action simple, édition en ligne",
      intention:
        "Un seul champ, un toggle, un date picker : RHF est de trop. useMutation, le SDK, handleSdkError, un toast.",
      langage: "tsx",
      source: "reactony.md §4",
      surligne: [5, 7, 8],
      code: `import { toast } from "sonner";

const mutation = useMutation({
  mutationFn: async (data: { id: string; value: string }) => {
    const result = await postFieldUpdate({ body: data });
    const errors = handleSdkError(result);
    if (errors) throw new Error(Object.values(errors)[0]);
  },
  onSuccess: () => toast.success("Enregistré"),
  onError: (error: Error) => toast.error(error.message),
});`,
    },
    {
      id: "cache",
      rang: "5",
      titre: "Invalider le cache",
      intention:
        "Toute mutation qui change une donnée lue ailleurs invalide, dans son onSuccess, avec les mêmes queryOptions générées.",
      langage: "tsx",
      source: "reactony.md §4 · Playbook 5",
      surligne: [6, 7],
      code: `import { getSearchAlertListOptions } from "@/lib/api";

const queryClient = useQueryClient();

const mutation = useMutation({
  mutationFn: postSearchAlert,
  onSuccess: () =>
    queryClient.invalidateQueries({ ...getSearchAlertListOptions({ query: filters }) }),
});`,
    },
    {
      id: "tests",
      rang: "6",
      titre: "Les tests dus",
      intention:
        "Ce qu'une nouvelle route et un nouveau parcours doivent, par rendement décroissant.",
      fichier: "tests/Functional/SearchAlertControllerTest.php",
      langage: "php",
      source: "symfony-guidelines.md, Playbook 6 · §13",
      surligne: [9, 14],
      piege:
        "Le calcul d'argent (frais, paliers, tranches) part avec un test basé sur les propriétés, via Eris : les cas limites d'arrondi ne se trouvent pas à la main.",
      code: `<?php

public function testCreateSearchAlert(): void
{
    $client = static::createClient();
    $client->loginUser(UserFactory::createOne()->_real());

    // Le contrat HTTP.
    $client->jsonRequest('POST', '/api/search-alerts', ['channels' => ['email']]);
    self::assertResponseStatusCodeSame(201);

    // Et l'état en base : les deux, pas l'un ou l'autre.
    SearchAlertFactory::assert()->count(1);
}

// Fonctionnel PHPUnit pour toute nouvelle route /api/ non triviale.
// Unitaire sans mocks pour le Domain pur, Foundry pour construire les entités.
// Vitest + RTL + MSW pour les 422 d'un formulaire React.
// Playwright pour chaque nouveau parcours utilisateur.`,
    },
    {
      id: "dod",
      rang: "7",
      titre: "Definition of Done",
      intention: "La feature est finie quand toutes ces lignes sont vertes.",
      langage: "md",
      source: "symfony-guidelines.md, Definition of Done",
      code: `- [ ] /quality passe : PHPStan niveau 9+, PHP-CS-Fixer, ESLint, Prettier, \`tsc --noEmit\`
- [ ] \`make types\` ne produit aucune dérive dans \`assets/lib/api/\`
- [ ] \`doctrine:schema:validate --skip-sync\` OK
- [ ] \`lint:container\` OK
- [ ] Un test fonctionnel par nouvelle route /api/ non triviale
- [ ] Un test basé sur les propriétés (Eris) sur tout nouveau calcul d'argent
- [ ] Un spec Playwright par nouveau parcours utilisateur
- [ ] /live-test joue : chemin nominal plus un cas limite, console et réseau propres
- [ ] \`#[IsGranted]\` et \`format: 'json'\` présents sur les nouvelles routes /api/`,
    },
  ],
};

const patterns = {
  id: "patterns",
  label: "Patterns du moment",
  resume:
    "Ce que Symfony 8.1 et PHP 8.5 ont apporté, et les patrons qui ne dépendent pas d'une feature en cours.",
  ecrans: [
    {
      id: "serialize",
      rang: "SF 8.1",
      titre: "#[Serialize], le miroir de MapRequestPayload",
      intention:
        "L'entrée avait son attribut, la sortie a le sien. Le contrôleur retourne le DTO, le tableau ou l'entité : plus de $this->json(...).",
      langage: "php",
      source: "symfony-guidelines.md §3",
      surligne: [4],
      piege:
        "Vérifié sur un cas réel : sortie identique à l'octet près, zéro dérive OpenAPI, SDK ou Zod. C'est le défaut pour les nouveaux endpoints /api/, l'existant migre à l'occasion.",
      code: `<?php

/** @return array<int, ModelSave> */
#[Route('/api/farm-model/saves', methods: ['GET'], format: 'json')]
#[Serialize(context: ['groups' => ['model_save:read']])]
public function getModelSaves(): array
{
    return $this->getUser()->getModelSaves()->toArray();
}`,
    },
    {
      id: "filtres",
      rang: "Lecture",
      titre: "Les filtres GET passent par un DTO",
      intention:
        "Le seul cas où un DTO se justifie d'office : des filtres ne sont pas une entité.",
      langage: "php",
      source: "reactony.md §1 · symfony-guidelines.md §4",
      surligne: [4],
      code: `<?php

#[Route('/api/farms', methods: ['GET'], format: 'json')]
public function list(
    #[MapQueryString] FarmFilterDto $filters = new FarmFilterDto(),
): JsonResponse {
    return $this->json($this->farmRepository->findByFilters($filters));
}`,
    },
    {
      id: "allowlist",
      rang: "Écriture",
      titre: "Le DTO allowlist, pour un sous-ensemble",
      intention:
        "Quand le formulaire édite quelques champs d'une grosse entité, le DTO est la liste de ce qui a le droit de bouger, et ObjectMapper fait le report.",
      langage: "php",
      source: "symfony-guidelines.md §4",
      surligne: [3, 5],
      code: `<?php

#[Map(target: Profile::class)]
final class PartialProfileDto
{
    #[Assert\\Length(max: 120)]
    public ?string $bio = null;

    #[Assert\\NotBlank]
    public string $city = '';
}

// Dans le contrôleur : $this->objectMapper->map($dto, $profile);
// Ce qui n'est pas dans le DTO ne peut pas être écrit, même envoyé.`,
    },
    {
      id: "upload",
      rang: "SF 8.1",
      titre: "L'upload de fichier",
      intention:
        "Un DTO plat avec un ?UploadedFile et son Assert\\File, par MapRequestPayload. L'identifiant vit dans la route.",
      langage: "php",
      source: "symfony-guidelines.md §4 · reactony.md §2",
      surligne: [6, 7],
      piege:
        "Côté frontend, garder file.size aligné sur maxSize : au-delà de upload_max_filesize, le SAPI PHP jette silencieusement, le résolveur rend un 422 vide et le toast reste muet.",
      code: `<?php

final class ProjectImageDto
{
    #[Assert\\NotNull]
    #[Assert\\File(maxSize: '8M', mimeTypes: ['image/jpeg', 'image/png'])]
    public ?UploadedFile $image = null;
}

#[IsGranted('ROLE_USER')]
#[Route('/api/projects/{id}/image', methods: ['POST'], format: 'json')]
public function upload(string $id, #[MapRequestPayload] ProjectImageDto $dto): Response
{
    // Le SDK généré gère le multipart via formDataBodySerializer : rien à assembler à la main.
}`,
    },
    {
      id: "voter",
      rang: "Sécurité",
      titre: "Chaque affordance a le voter de son action",
      intention:
        "Une page ouverte à un rôle large n'autorise pas tous ses boutons. On garde chaque appel à l'action avec le voter de l'action visée, sur le sujet.",
      langage: "twig",
      source: "symfony-guidelines.md §3",
      surligne: [2, 3],
      piege:
        "Un is_granted('ROLE_X') brut sur un bouton est la fuite récurrente : le rôle voit la page, clique, et prend un 403 qui remonte dans Sentry comme un bug.",
      code: `{# la page est ouverte à plusieurs rôles, les boutons ne le sont pas #}
{% if is_granted('edit', structure) %}...{% endif %}
{% if is_granted('show_groups', structure) %}...{% endif %}`,
    },
    {
      id: "foundry",
      rang: "Tests",
      titre: "Foundry et le rollback transactionnel",
      intention:
        "Les entités de test se construisent par factory, et DAMA rend chaque test indépendant sans truncate manuel.",
      langage: "php",
      source: "symfony-guidelines.md §13",
      code: `<?php

// Une factory dit l'intention du test, pas la forme de la table.
$searchAlert = SearchAlertFactory::createOne(['channels' => ['email']]);

SearchAlertFactory::createMany(3, ['channels' => ['sms']]);

// DAMA Doctrine Test Bundle enveloppe chaque test dans une transaction
// et la rejette à la fin : pas de nettoyage à écrire, pas de fuite entre tests.`,
    },
  ],
};

const pieges = {
  id: "pieges",
  label: "Pièges",
  resume:
    "Les anti-patterns fermés. Trouvés dans l'existant, ils sont à refactorer, pas à recopier.",
  ecrans: [
    {
      id: "fetch",
      rang: "Données",
      titre: "useEffect + fetch, et le fetch nu",
      intention:
        "Les queryOptions sont générées par hey-api : les écrire à la main, ou pire les contourner, c'est perdre le typage et le cache d'un coup.",
      langage: "tsx",
      source: "reactony.md §10",
      surligne: [2, 3, 4, 7],
      code: `// Non.
useEffect(() => {
  fetch("/api/search-alerts").then((r) => r.json()).then(setSearchAlerts);
}, []);

// Non plus : un fetch nu contourne le SDK généré.
const response = await fetch("/api/search-alerts", { method: "POST" });

// Oui.
const { data } = useQuery({ ...getSearchAlertListOptions({ query: filters }) });`,
    },
    {
      id: "422",
      rang: "Formulaire",
      titre: "Une mutation sans handleSdkError",
      intention:
        "Les 422 sont silencieusement perdus pour l'utilisateur : le formulaire ne bouge pas, aucun champ ne rougit, rien n'explique.",
      langage: "tsx",
      source: "reactony.md §10 · §3",
      surligne: [2, 3],
      code: `// Non.
const mutation = useMutation({ mutationFn: postSearchAlert });

// Oui : les violations remontent champ par champ.
const errors = handleSdkError(result);
if (errors) {
  Object.entries(errors).forEach(([field, message]) =>
    form.setError(field as any, { message }),
  );
}

// form.setError(field as any, ...) est le seul any toléré du projet :
// c'est le contournement documenté du typage de Object.entries avec RHF.`,
    },
    {
      id: "stimulus",
      rang: "Twig",
      titre: "Un nouveau contrôleur Stimulus",
      intention:
        "Stimulus n'est que le pont de montage. Un contrôleur avec du state, un fetch, de la logique : c'est un îlot React.",
      langage: "twig",
      source: "reactony.md §6 · §10",
      surligne: [1, 2, 3, 4],
      piege:
        'Une tolérance : un comportement DOM sans état, sous une trentaine de lignes, un copier-dans-le-presse-papier par exemple, où un îlot serait disproportionné. Et réactiver Turbo Drive sans décision explicite remonte les îlots React et leur fait perdre leur état. Le site est délibérément en data-turbo="false".',
      code: `{# Le montage, et rien d'autre. #}
<div {{ react_component('SearchAlertForm', {
    farm: farm|serialize('json', { groups: ['farm:read'] }),
}) }}></div>`,
    },
    {
      id: "query-order",
      rang: "Doctrine",
      titre: "Une requête sans ORDER BY n'a pas d'ordre",
      intention:
        "Postgres rend les lignes dans l'ordre qui l'arrange, et il change avec le plan. Le tri stable se déclare.",
      langage: "php",
      source: "symfony-guidelines.md §7",
      surligne: [6],
      piege:
        "KnpPaginator place son propre tri devant le vôtre : le tri par défaut se passe en option du paginateur, pas seulement dans le QueryBuilder.",
      code: `<?php

return $this->createQueryBuilder('a')
    ->andWhere('a.active = true')
    // Sans cette ligne, l'ordre dépend du plan d'exécution.
    ->orderBy('a.createdAt', 'DESC')
    ->addOrderBy('a.id', 'DESC') // départage, pour rendre l'ordre total
    ->getQuery()
    ->getResult();`,
    },
    {
      id: "secret-log",
      rang: "Logs",
      titre: "Un secret en query string finit dans les logs",
      intention:
        "HttpClient journalise chaque appel en INFO avec l'URL complète, query string comprise. Une API amont qui s'authentifie par un paramètre key ou token écrit donc son propre identifiant dans les logs, et dans les breadcrumbs Sentry.",
      fichier: "src/Logger/RedactQueryStringSecretsProcessor.php",
      langage: "php",
      source: "symfony-guidelines.md, Logging & Sentry",
      surligne: [5, 9, 10, 11],
      piege:
        "Le contrat appartient à l'amont, donc le paramètre ne peut en général pas passer en en-tête : on caviarde à la sortie. Et avec un handler fingers_crossed, ces lignes INFO remontent dès que quoi que ce soit d'autre échoue dans la même requête, c'est-à-dire précisément quand l'amont est instable.",
      code: `<?php

// Appliqué à tous les canaux : la requête part intacte, seule la ligne de log change.
#[AsMonologProcessor]
final class RedactQueryStringSecretsProcessor
{
    private const SENSITIVE = ['key', 'token', 'api_key', 'access_token', 'password'];

    public function __invoke(LogRecord $record): LogRecord
    {
        return $record->with(message: preg_replace(
            '/\\b('.implode('|', self::SENSITIVE).')=[^&"\\s]+/i',
            '$1=[REDACTED]',
            $record->message,
        ));
    }
}

// Pour /gap-code : un client d'API qui passe un identifiant dans query est un
// constat Haute tant que rien ne caviarde à la sortie.`,
    },
  ],
};

export const SYMFONY_REACT: Pile = {
  id: "symfony-react",
  label: "Symfony, îlots React",
  labelCourt: "Symfony + React",
  these:
    "Twig rend les pages, React prend la main là où il faut de l'interaction. PHP est la source de vérité, les types TS en descendent.",
  guideline: "symfony-react/symfony-guidelines.md et reactony.md",
  pistes: [featureFullstack, patterns, pieges],
};
